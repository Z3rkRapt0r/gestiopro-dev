
-- Crea una tabella per gestire il bilancio di ferie e permessi per ogni dipendente
CREATE TABLE public.employee_leave_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  vacation_days_total INTEGER NOT NULL DEFAULT 0,
  vacation_days_used INTEGER NOT NULL DEFAULT 0,
  permission_hours_total INTEGER NOT NULL DEFAULT 0,
  permission_hours_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(user_id, year)
);

-- Abilita RLS sulla tabella
ALTER TABLE public.employee_leave_balance ENABLE ROW LEVEL SECURITY;

-- Policy: Solo gli admin possono visualizzare tutti i bilanci
CREATE POLICY "admin can view all leave balances"
  ON public.employee_leave_balance
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policy: Gli utenti possono vedere solo il proprio bilancio
CREATE POLICY "users can view own leave balance"
  ON public.employee_leave_balance
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Solo gli admin possono inserire/modificare i bilanci
CREATE POLICY "admin can manage leave balances"
  ON public.employee_leave_balance
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_employee_leave_balance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_leave_balance_updated_at
  BEFORE UPDATE ON public.employee_leave_balance
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_leave_balance_updated_at();
