-- Create parties table to manage multiple parties
CREATE TABLE public.parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- Create policies for parties
CREATE POLICY "Authenticated users can view parties" 
ON public.parties 
FOR SELECT 
USING (true);

CREATE POLICY "Administrators can manage parties" 
ON public.parties 
FOR ALL 
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- Create participant_drinks table to track drinks per party per participant
CREATE TABLE public.participant_drinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  drink_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant_id, party_id)
);

-- Enable RLS
ALTER TABLE public.participant_drinks ENABLE ROW LEVEL SECURITY;

-- Create policies for participant_drinks
CREATE POLICY "Authenticated users can view participant drinks" 
ON public.participant_drinks 
FOR SELECT 
USING (true);

CREATE POLICY "Administrators can manage all participant drinks" 
ON public.participant_drinks 
FOR ALL 
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Volunteers can update drink counts" 
ON public.participant_drinks 
FOR UPDATE 
USING (has_role(auth.uid(), 'volunteer'::app_role))
WITH CHECK (has_role(auth.uid(), 'volunteer'::app_role));

CREATE POLICY "Volunteers can insert drink records" 
ON public.participant_drinks 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'volunteer'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_parties_updated_at
BEFORE UPDATE ON public.parties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_participant_drinks_updated_at
BEFORE UPDATE ON public.participant_drinks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample parties
INSERT INTO public.parties (name, date, is_active) VALUES 
('Party 1 - Seara de Bun Venit', '2024-07-20', true),
('Party 2 - Petrecerea de Vară', '2024-07-22', false),
('Party 3 - Noaptea Finală', '2024-07-24', false);

-- Function to get active party
CREATE OR REPLACE FUNCTION public.get_active_party()
RETURNS TABLE(id uuid, name text, date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p.id, p.name, p.date
  FROM public.parties p
  WHERE p.is_active = true
  LIMIT 1;
$$;