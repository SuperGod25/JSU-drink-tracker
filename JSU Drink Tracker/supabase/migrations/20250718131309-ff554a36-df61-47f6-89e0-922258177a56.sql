-- First, let's find the user ID for the email you just created
-- Replace 'your-admin-email@example.com' with the actual email you used
-- Run this query first to get the user_id:
-- SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com';

-- Then insert the administrator role for that user
-- Replace 'USER_ID_HERE' with the actual UUID from the query above
INSERT INTO public.user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'administrator'::app_role);