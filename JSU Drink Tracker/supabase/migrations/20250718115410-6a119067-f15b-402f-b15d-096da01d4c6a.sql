-- Add RLS policies for user_profiles table
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Insert sample users into user_profiles
INSERT INTO public.user_profiles (id, username, email, role) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', 'admin@jsu.ro', 'volunteer'),
('00000000-0000-0000-0000-000000000002', 'volunteer1', 'volunteer1@jsu.ro', 'volunteer'),
('00000000-0000-0000-0000-000000000003', 'coordinator', 'coordinator@jsu.ro', 'volunteer');

-- Insert sample data into participants table
INSERT INTO public.participants (nume, facultate, numar_camera, cazat, major, numar_bauturi) VALUES
('Ana Popescu', 'Facultatea de Informatica', 'A101', true, false, 2),
('Ion Marinescu', 'Facultatea de Matematica', 'A102', true, true, 1),
('Maria Ionescu', 'Facultatea de Fizica', 'B201', false, false, 0),
('Andrei Dumitrescu', 'Facultatea de Chimie', 'B202', true, true, 3);