-- Corrective follow-up for the carbon-paper default theme rollout.
-- This only updates future rows and rows that still have a null theme_key value.
-- Previously overwritten non-null theme selections cannot be reconstructed here.
alter table public.user_preferences
  alter column theme_key set default 'carbon-paper';

update public.user_preferences
set
  theme_key = 'carbon-paper',
  updated_at = now()
where theme_key is null;
