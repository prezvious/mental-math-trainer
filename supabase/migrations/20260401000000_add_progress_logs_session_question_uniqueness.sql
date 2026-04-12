alter table public.progress_logs
  drop constraint if exists progress_logs_user_session_question_key;

alter table public.progress_logs
  add constraint progress_logs_user_session_question_key
  unique (user_id, session_id, question_index);
