
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

export const useEmployeeUpdate = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateEmployee = async (id: string, employeeData: Partial<Employee>) => {
    try {
      setLoading(true);
      
      // Previeni la modifica del ruolo da dipendente ad admin tramite questa funzione
      const updateData = { ...employeeData };
      if (updateData.role && updateData.role !== 'employee') {
        delete updateData.role;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .eq('role', 'employee') // Aggiorna solo se è un dipendente
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Dipendente aggiornato",
        description: "Le informazioni sono state salvate con successo",
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento del dipendente",
        variant: "destructive",
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployeeStatus = async (id: string, isActive: boolean) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('role', 'employee') // Modifica solo dipendenti
        .select()
        .single();

      if (error) throw error;

      toast({
        title: isActive ? "Dipendente attivato" : "Dipendente disattivato",
        description: `Il dipendente è stato ${isActive ? 'riattivato' : 'disattivato'} con successo`,
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Error toggling employee status:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la modifica dello stato",
        variant: "destructive",
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    updateEmployee,
    toggleEmployeeStatus,
    loading,
    isLoading: loading
  };
};
