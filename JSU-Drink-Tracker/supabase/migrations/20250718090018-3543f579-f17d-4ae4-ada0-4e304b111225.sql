-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('volunteer', 'administrator');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nume TEXT NOT NULL,
  facultate TEXT NOT NULL,
  numar_camera TEXT NOT NULL,
  major BOOLEAN NOT NULL DEFAULT false,
  cazat BOOLEAN NOT NULL DEFAULT false,
  numar_bauturi INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Administrators can manage roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'administrator'));

-- RLS policies for participants
CREATE POLICY "Authenticated users can view participants" 
ON public.participants 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Volunteers can update numar_bauturi only" 
ON public.participants 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'volunteer'))
WITH CHECK (public.has_role(auth.uid(), 'volunteer'));

CREATE POLICY "Administrators can manage all participants" 
ON public.participants 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'administrator'))
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_participants_updated_at
BEFORE UPDATE ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for participants
ALTER TABLE public.participants REPLICA IDENTITY FULL;

-- Add participants to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;