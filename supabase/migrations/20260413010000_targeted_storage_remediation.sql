create or replace function public.get_progress_dashboard_data(
  session_limit integer default 8,
  attempt_limit integer default 12
)
returns jsonb
language sql
stable
as $$
  with limits as (
    select
      greatest(coalesce(session_limit, 8), 1) as recent_session_limit,
      greatest(coalesce(attempt_limit, 12), 1) as recent_attempt_limit,
      now() - interval '90 days' as recent_cutoff
  ),
  manual_overview as (
    select
      count(*)::integer as total_attempts,
      coalesce(sum(case when p.is_correct then 1 else 0 end), 0)::integer as correct_attempts,
      coalesce(sum(p.response_ms), 0)::bigint as total_response_ms,
      coalesce(min(p.response_ms), 0)::integer as fastest
    from public.progress_logs p
    where p.user_id = auth.uid()
  ),
  ai_overview as (
    select
      count(*)::integer as total_attempts,
      count(*)::integer as correct_attempts,
      coalesce(sum(a.response_ms), 0)::bigint as total_response_ms,
      coalesce(min(a.response_ms), 0)::integer as fastest
    from public.ai_mode_logs a
    where a.user_id = auth.uid()
  ),
  overview as (
    select
      (manual.total_attempts + ai.total_attempts)::integer as total_attempts,
      (manual.correct_attempts + ai.correct_attempts)::integer as correct_attempts,
      case
        when (manual.total_attempts + ai.total_attempts) = 0 then 0
        else round(
          (
            (manual.correct_attempts + ai.correct_attempts)::numeric /
            (manual.total_attempts + ai.total_attempts)::numeric
          ) * 100,
          1
        )
      end as accuracy,
      case
        when (manual.total_attempts + ai.total_attempts) = 0 then 0
        else round(
          (manual.total_response_ms + ai.total_response_ms)::numeric /
          (manual.total_attempts + ai.total_attempts)::numeric
        )::integer
      end as average_response_ms,
      (manual.total_response_ms + ai.total_response_ms)::bigint as total_response_ms,
      coalesce(
        least(nullif(manual.fastest, 0), nullif(ai.fastest, 0)),
        nullif(manual.fastest, 0),
        nullif(ai.fastest, 0),
        0
      )::integer as fastest
    from manual_overview manual
    cross join ai_overview ai
  ),
  manual_operation_breakdown as (
    select
      p.operation as operation,
      count(*)::integer as attempts,
      coalesce(sum(case when p.is_correct then 1 else 0 end), 0)::integer as correct,
      coalesce(sum(p.response_ms), 0)::bigint as total_response_ms
    from public.progress_logs p
    where p.user_id = auth.uid()
    group by p.operation
  ),
  ai_operation_breakdown as (
    select
      a.operation_label as operation,
      count(*)::integer as attempts,
      count(*)::integer as correct,
      coalesce(sum(a.response_ms), 0)::bigint as total_response_ms
    from public.ai_mode_logs a
    where a.user_id = auth.uid()
    group by a.operation_label
  ),
  operation_breakdown_source as (
    select
      grouped.operation,
      sum(grouped.attempts)::integer as attempts,
      sum(grouped.correct)::integer as correct,
      case
        when sum(grouped.attempts) = 0 then 0
        else round(
          (sum(grouped.correct)::numeric / sum(grouped.attempts)::numeric) * 100,
          1
        )
      end as accuracy,
      case
        when sum(grouped.attempts) = 0 then 0
        else round(
          sum(grouped.total_response_ms)::numeric / sum(grouped.attempts)::numeric
        )::integer
      end as average_response_ms,
      sum(grouped.total_response_ms)::bigint as total_response_ms
    from (
      select * from manual_operation_breakdown
      union all
      select * from ai_operation_breakdown
    ) grouped
    group by grouped.operation
  ),
  manual_recent_sessions_ranked as (
    select
      'manual:' || p.session_id::text as session_key,
      p.session_id,
      'manual'::text as source_mode,
      count(*)::integer as attempts,
      coalesce(sum(case when p.is_correct then 1 else 0 end), 0)::integer as correct,
      coalesce(sum(p.response_ms), 0)::bigint as total_response_ms,
      coalesce(round(avg(p.response_ms))::integer, 0) as average_response_ms,
      max(p.created_at) as latest_created_at,
      case
        when count(distinct p.operation) > 1 then 'Mixed'
        else
          case max(p.operation)
            when 'ADDITION' then 'Addition'
            when 'SUBTRACTION' then 'Subtraction'
            when 'MULTIPLICATION' then 'Multiplication'
            when 'DIVISION' then 'Division'
            when 'EXPONENTIATION' then 'Exponentiation'
            when 'SQUARES' then 'Exponentiation'
            when 'CUSTOM' then 'Custom'
            else max(p.operation)
          end
      end as mode_label,
      case
        when count(distinct (
          case
            when p.operation in ('EXPONENTIATION', 'SQUARES') then null
            else p.digits_left::text || 'x' || p.digits_right::text
          end
        )) > 1 then 'Varies'
        else coalesce(
          max(
            case
              when p.operation in ('EXPONENTIATION', 'SQUARES') then null
              else p.digits_left::text || 'x' || p.digits_right::text
            end
          ),
          'N/A'
        )
      end as digits_label
    from public.progress_logs p
    where p.user_id = auth.uid()
      and p.created_at >= (select recent_cutoff from limits)
    group by p.session_id
    order by max(p.created_at) desc
    limit (select recent_session_limit from limits)
  ),
  ai_recent_sessions_ranked as (
    select
      'ai:' || a.session_id::text as session_key,
      a.session_id,
      'ai'::text as source_mode,
      count(*)::integer as attempts,
      count(*)::integer as correct,
      coalesce(sum(a.response_ms), 0)::bigint as total_response_ms,
      coalesce(round(avg(a.response_ms))::integer, 0) as average_response_ms,
      max(a.created_at) as latest_created_at,
      case
        when bool_or(a.source_kind = 'custom') then 'Custom Solver'
        else
          case max(a.operation_label)
            when 'ADDITION' then 'Addition'
            when 'SUBTRACTION' then 'Subtraction'
            when 'MULTIPLICATION' then 'Multiplication'
            when 'DIVISION' then 'Division'
            when 'EXPONENTIATION' then 'Exponentiation'
            when 'SQUARES' then 'Exponentiation'
            when 'CUSTOM' then 'Custom'
            else max(a.operation_label)
          end
      end as mode_label,
      case
        when bool_or(a.source_kind = 'custom') then 'N/A'
        else 'Auto'
      end as digits_label
    from public.ai_mode_logs a
    where a.user_id = auth.uid()
      and a.created_at >= (select recent_cutoff from limits)
    group by a.session_id
    order by max(a.created_at) desc
    limit (select recent_session_limit from limits)
  ),
  recent_sessions_source as (
    select *
    from (
      select * from manual_recent_sessions_ranked
      union all
      select * from ai_recent_sessions_ranked
    ) recent_sessions
    order by recent_sessions.latest_created_at desc
    limit (select recent_session_limit from limits)
  ),
  manual_recent_attempts_ranked as (
    select
      'manual-' || p.id::text as id,
      'manual'::text as source_mode,
      'trainer'::text as source_kind,
      case
        when p.operation in ('EXPONENTIATION', 'SQUARES') then
          p.left_operand::text || ' ^ ' || p.right_operand::text
        else
          p.left_operand::text || ' ' ||
          case p.operation
            when 'ADDITION' then '+'
            when 'SUBTRACTION' then '-'
            when 'MULTIPLICATION' then '*'
            when 'DIVISION' then '/'
            else '?'
          end || ' ' || p.right_operand::text
      end as prompt_text,
      'integer'::text as result_kind,
      p.correct_answer as result_exact_text,
      p.correct_answer as result_decimal_text,
      p.is_correct,
      p.response_ms,
      p.created_at
    from public.progress_logs p
    where p.user_id = auth.uid()
      and p.created_at >= (select recent_cutoff from limits)
    order by p.created_at desc
    limit (select recent_attempt_limit from limits)
  ),
  ai_recent_attempts_ranked as (
    select
      'ai-' || a.id::text as id,
      'ai'::text as source_mode,
      a.source_kind,
      a.prompt_text,
      a.result_kind,
      a.result_exact_text,
      coalesce(a.result_decimal_text, a.result_exact_text) as result_decimal_text,
      true as is_correct,
      a.response_ms,
      a.created_at
    from public.ai_mode_logs a
    where a.user_id = auth.uid()
      and a.created_at >= (select recent_cutoff from limits)
    order by a.created_at desc
    limit (select recent_attempt_limit from limits)
  ),
  recent_attempts_source as (
    select *
    from (
      select * from manual_recent_attempts_ranked
      union all
      select * from ai_recent_attempts_ranked
    ) recent_attempts
    order by recent_attempts.created_at desc
    limit (select recent_attempt_limit from limits)
  )
  select jsonb_build_object(
    'overview',
    jsonb_build_object(
      'totalAttempts', overview.total_attempts,
      'correctAttempts', overview.correct_attempts,
      'accuracy', overview.accuracy,
      'averageResponseMs', overview.average_response_ms,
      'totalResponseMs', overview.total_response_ms,
      'fastest', overview.fastest
    ),
    'operationBreakdown',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'operation', row.operation,
            'attempts', row.attempts,
            'correct', row.correct,
            'accuracy', row.accuracy,
            'averageResponseMs', row.average_response_ms,
            'totalResponseMs', row.total_response_ms
          )
          order by row.operation
        )
        from operation_breakdown_source row
      ),
      '[]'::jsonb
    ),
    'recentSessions',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'sessionKey', row.session_key,
            'sessionId', row.session_id,
            'sourceMode', row.source_mode,
            'attempts', row.attempts,
            'correct', row.correct,
            'totalResponseMs', row.total_response_ms,
            'averageResponseMs', row.average_response_ms,
            'latestCreatedAt', row.latest_created_at,
            'modeLabel', row.mode_label,
            'digitsLabel', row.digits_label
          )
          order by row.latest_created_at desc
        )
        from recent_sessions_source row
      ),
      '[]'::jsonb
    ),
    'recentAttempts',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', row.id,
            'sourceMode', row.source_mode,
            'sourceKind', row.source_kind,
            'promptText', row.prompt_text,
            'resultKind', row.result_kind,
            'resultExactText', row.result_exact_text,
            'resultDecimalText', row.result_decimal_text,
            'isCorrect', row.is_correct,
            'responseMs', row.response_ms,
            'createdAt', row.created_at
          )
          order by row.created_at desc
        )
        from recent_attempts_source row
      ),
      '[]'::jsonb
    )
  )
  from overview;
$$;

grant execute on function public.get_progress_dashboard_data(integer, integer) to authenticated;

drop index if exists public.progress_logs_user_operation_idx;
drop index if exists public.ai_mode_logs_user_source_idx;
