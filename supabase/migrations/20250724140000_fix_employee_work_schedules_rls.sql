-- Fix RLS policies for employee_work_schedules
-- Allow employees to read their own work schedules

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Only admins can manage employee work schedules" ON public.employee_work_schedules;

-- Create new policy for admins to manage all work schedules
CREATE POLICY "Admins can manage all employee work schedules" ON public.employee_work_schedules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create policy for employees to read their own work schedules
CREATE POLICY "Employees can view their own work schedules" ON public.employee_work_schedules
FOR SELECT USING (
  employee_id = auth.uid()
); 