-- Add email column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN email TEXT;

-- Update existing profiles to have email from auth.users if any exist
-- This is a one-time update for any existing data
UPDATE public.user_profiles 
SET email = auth_users.email 
FROM auth.users AS auth_users 
WHERE user_profiles.id = auth_users.id;