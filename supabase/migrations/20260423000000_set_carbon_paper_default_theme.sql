update public.user_preferences
set
  theme_key = 'carbon-paper',
  updated_at = now()
where theme_key is distinct from 'carbon-paper';
