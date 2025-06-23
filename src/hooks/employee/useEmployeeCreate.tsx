
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
  hire_date: string | null;
  employee_code: string | null;
  is_active: boolean;
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

      // Usa signUp normale invece di admin.createUser
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: employeeData.email,
        password: employeeData.password,
        options: {
          data: {
            first_name: employeeData.first_name || '',
            last_name: employeeData.last_name || '',
            role: 'employee'
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Errore nella creazione dell\'utente');
      }

      // Crea il profilo nella tabella profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          first_name: employeeData.first_name || null,
          last_name: employeeData.last_name || null,
          email: employeeData.email,
          role: 'employee',
          department: employeeData.department || null,
          hire_date: employeeData.hire_date || null,
          employee_code: employeeData.employee_code || null,
          is_active: true
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      toast({
        title: "Dipendente creato",
        description: "Il dipendente è stato aggiunto con successo. Dovrà confermare l'email per attivare l'account.",
      });

      return { data: profileData, error: null };
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
