
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

      // Crea direttamente il profilo senza aspettare la registrazione
      const temporaryId = crypto.randomUUID();
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: temporaryId,
          first_name: employeeData.first_name || null,
          last_name: employeeData.last_name || null,
          email: employeeData.email,
          role: 'employee',
          department: employeeData.department || null,
          employee_code: employeeData.employee_code || null,
          is_active: true
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      // Prova a creare l'utente auth in background, ma non bloccare se fallisce
      try {
        await supabase.auth.signUp({
          email: employeeData.email,
          password: employeeData.password,
          options: {
            data: {
              first_name: employeeData.first_name || '',
              last_name: employeeData.last_name || '',
              role: 'employee',
              profile_id: temporaryId
            }
          }
        });
      } catch (authError) {
        console.warn('Auth creation failed, but profile created:', authError);
      }

      toast({
        title: "Dipendente creato",
        description: "Il dipendente è stato aggiunto con successo.",
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
