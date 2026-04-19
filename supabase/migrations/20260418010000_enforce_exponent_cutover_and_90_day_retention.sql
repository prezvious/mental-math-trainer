update public.user_preferences
set trainer_operation = 'EXPONENTIATION'
where trainer_operation = 'SQUARES';

update public.progress_logs
set operation = 'EXPONENTIATION'
where operation = 'SQUARES';

alter table public.user_preferences
  drop constraint if exists user_preferences_trainer_operation_check;

alter table public.user_preferences
  add constraint user_preferences_trainer_operation_check
  check (trainer_operation in ('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'EXPONENTIATION'));

alter table public.progress_logs
  drop constraint if exists progress_logs_operation_check;

alter table public.progress_logs
  add constraint progress_logs_operation_check
  check (operation in ('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'EXPONENTIATION'));

delete from public.progress_logs
where created_at < now() - interval '90 days';

delete from public.ai_mode_logs
where created_at < now() - interval '90 days';

create or replace function public.get_progress_dashboard_data(
  session_limit integer default 8,
  attempt_limit integer default 12
)
returns jsonb
language sql
stable
as $$
  with manual_logs as (
    select
      'manual-' || p.id::text as id,
      'manual'::text as source_mode,
      'trainer'::text as source_kind,
      p.session_id,
      p.question_index,
      p.operation as operation_label,
      case
        when p.operation = 'EXPONENTIATION' then
          p.left_operand || ' ^ ' || p.right_operand
        else
          p.left_operand || ' ' ||
          case p.operation
            when 'ADDITION' then '+'
            when 'SUBTRACTION' then '-'
            when 'MULTIPLICATION' then '*'
            when 'DIVISION' then '/'
            else '?'
          end || ' ' || p.right_operand
      end as prompt_text,
      case
        when coalesce(to_jsonb(p)->>'practice_mode', 'POSITIVE') = 'DECIMAL' then 'decimal'
        else 'integer'
      end as result_kind,
      p.correct_answer as result_exact_text,
      p.correct_answer as result_decimal_text,
      p.submitted_answer as submitted_answer_text,
      p.correct_answer as correct_answer_text,
      p.is_correct,
      p.response_ms,
      p.created_at,
      case
        when p.operation = 'EXPONENTIATION' then null
        when coalesce(to_jsonb(p)->>'practice_mode', 'POSITIVE') = 'DECIMAL' then
          p.digits_left::text || 'd/' || coalesce(to_jsonb(p)->>'left_decimal_digits', '0') || 'dp x ' ||
          p.digits_right::text || 'd/' || coalesce(to_jsonb(p)->>'right_decimal_digits', '0') || 'dp'
        else
          p.digits_left::text || 'x' || p.digits_right::text
      end as digit_label
    from public.progress_logs p
    where p.user_id = auth.uid()
      and p.created_at >= now() - interval '90 days'
  ),
  ai_logs as (
    select
      'ai-' || a.id::text as id,
      'ai'::text as source_mode,
      a.source_kind,
      a.session_id,
      a.question_index,
      a.operation_label,
      a.prompt_text,
      a.result_kind,
      a.result_exact_text,
      coalesce(a.result_decimal_text, a.result_exact_text) as result_decimal_text,
      a.result_exact_text as submitted_answer_text,
      a.result_exact_text as correct_answer_text,
      true as is_correct,
      a.response_ms,
      a.created_at,
      null::text as digit_label
    from public.ai_mode_logs a
    where a.user_id = auth.uid()
      and a.created_at >= now() - interval '90 days'
  ),
  combined_logs as (
    select * from manual_logs
    union all
    select * from ai_logs
  ),
  overview as (
    select
      count(*)::integer as total_attempts,
      coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer as correct_attempts,
      case
        when count(*) = 0 then 0
        else round(
          (
            sum(case when is_correct then 1 else 0 end)::numeric /
            count(*)::numeric
          ) * 100,
          1
        )
      end as accuracy,
      coalesce(round(avg(response_ms))::integer, 0) as average_response_ms,
      coalesce(sum(response_ms), 0)::bigint as total_response_ms,
      coalesce(min(response_ms), 0)::integer as fastest
    from combined_logs
  ),
  operation_breakdown_source as (
    select
      operation_label as operation,
      count(*)::integer as attempts,
      coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer as correct,
      case
        when count(*) = 0 then 0
        else round(
          (
            sum(case when is_correct then 1 else 0 end)::numeric /
            count(*)::numeric
          ) * 100,
          1
        )
      end as accuracy,
      coalesce(round(avg(response_ms))::integer, 0) as average_response_ms,
      coalesce(sum(response_ms), 0)::bigint as total_response_ms
    from combined_logs
    group by operation_label
  ),
  recent_sessions_source as (
    select
      source_mode || ':' || session_id::text as session_key,
      session_id,
      source_mode,
      count(*)::integer as attempts,
      coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer as correct,
      coalesce(sum(response_ms), 0)::bigint as total_response_ms,
      coalesce(round(avg(response_ms))::integer, 0) as average_response_ms,
      max(created_at) as latest_created_at,
      case
        when source_mode = 'ai' and bool_or(source_kind = 'custom') then 'Custom Solver'
        when source_mode = 'ai' then
          case max(operation_label)
            when 'ADDITION' then 'Addition'
            when 'SUBTRACTION' then 'Subtraction'
            when 'MULTIPLICATION' then 'Multiplication'
            when 'DIVISION' then 'Division'
            when 'EXPONENTIATION' then 'Exponentiation'
            when 'CUSTOM' then 'Custom'
            else max(operation_label)
          end
        when count(distinct operation_label) > 1 then 'Mixed'
        else
          case max(operation_label)
            when 'ADDITION' then 'Addition'
            when 'SUBTRACTION' then 'Subtraction'
            when 'MULTIPLICATION' then 'Multiplication'
            when 'DIVISION' then 'Division'
            when 'EXPONENTIATION' then 'Exponentiation'
            when 'CUSTOM' then 'Custom'
            else max(operation_label)
          end
      end as mode_label,
      case
        when source_mode = 'ai' and bool_or(source_kind = 'custom') then 'N/A'
        when source_mode = 'ai' then 'Auto'
        when count(distinct digit_label) filter (where digit_label is not null) > 1 then 'Varies'
        else coalesce(max(digit_label), 'N/A')
      end as digits_label
    from combined_logs
    group by source_mode, session_id
    order by max(created_at) desc
    limit greatest(coalesce(session_limit, 8), 1)
  ),
  recent_attempts_source as (
    select
      id,
      source_mode,
      source_kind,
      prompt_text,
      result_kind,
      result_exact_text,
      result_decimal_text,
      is_correct,
      response_ms,
      created_at
    from combined_logs
    order by created_at desc
    limit greatest(coalesce(attempt_limit, 12), 1)
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
