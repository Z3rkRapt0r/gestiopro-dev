-- Create overtime_records table for tracking employee overtime hours
CREATE TABLE public.overtime_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours > 0),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;

-- Create policies for overtime records
CREATE POLICY "Admins can manage all overtime records" 
ON public.overtime_records 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can view their own overtime records" 
ON public.overtime_records 
FOR SELECT 
USING (user_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_overtime_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_overtime_records_updated_at
BEFORE UPDATE ON public.overtime_records
FOR EACH ROW
EXECUTE FUNCTION public.update_overtime_records_updated_at();