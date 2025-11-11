
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  department: string | null;
  employee_code: string | null;
  hire_date: string | null;
  is_active: boolean;
  tracking_start_type?: 'from_hire_date' | 'from_year_start';
  created_at?: string;
  updated_at?: string;
}

export const useEmployeeCreate = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createEmployee = async (employeeData: Partial<Employee> & { password?: string }) => {
    try {
      setLoading(true);
      console.log('Creating employee with data:', employeeData);

      if (!employeeData.email || !employeeData.password) {
        throw new Error('Email e password sono obbligatori');
      }

      // Usa la Edge Function per creare il dipendente con privilegi admin
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          email: employeeData.email,
          password: employeeData.password,
          first_name: employeeData.first_name || null,
          last_name: employeeData.last_name || null,
          role: employeeData.role || 'employee',
          department: employeeData.department || null,
          employee_code: employeeData.employee_code || null,
          hire_date: employeeData.hire_date || null,
          tracking_start_type: employeeData.tracking_start_type || 'from_hire_date',
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message || 'Errore durante la chiamata alla funzione');
      }

      if (data?.error) {
        console.error('Server error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: "Dipendente creato",
        description: "Il dipendente è stato aggiunto con successo e può accedere immediatamente.",
      });

      return { data: data?.data, error: null };
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione del dipendente",
        variant: "destructive",
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    createEmployee,
    loading,
    isLoading: loading
  };
};
