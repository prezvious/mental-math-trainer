alter table public.progress_logs
  drop constraint if exists progress_logs_operation_check;

alter table public.progress_logs
  add constraint progress_logs_operation_check
  check (operation in ('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'SQUARES'));
