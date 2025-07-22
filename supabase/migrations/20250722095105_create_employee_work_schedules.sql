-- Tabella per orari e giorni di lavoro personalizzati per dipendente
CREATE TABLE IF NOT EXISTS public.employee_work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_days TEXT[] NOT NULL, -- es: ['monday','tuesday','wednesday']
  start_time TIME NOT NULL,  -- es: '08:00:00'
  end_time TIME NOT NULL,    -- es: '17:00:00'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Un dipendente può avere solo un record attivo
CREATE UNIQUE INDEX IF NOT EXISTS unique_employee_work_schedule ON public.employee_work_schedules(employee_id); 