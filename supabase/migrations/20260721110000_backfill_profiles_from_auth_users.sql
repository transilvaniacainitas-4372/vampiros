INSERT INTO public.profiles (id, display_name)
SELECT
  users.id,
  COALESCE(
    users.raw_user_meta_data->>'display_name',
    split_part(users.email, '@', 1),
    'Jogador'
  )
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles
  WHERE profiles.id = users.id
);
