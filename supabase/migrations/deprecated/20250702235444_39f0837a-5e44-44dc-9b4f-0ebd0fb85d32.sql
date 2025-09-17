-- Add foreign key constraint to overtime_records table to link to profiles
ALTER TABLE public.overtime_records 
ADD CONSTRAINT overtime_records_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;