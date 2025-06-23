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

export const useEmployeeOperations = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEmployees = async (): Promise<Employee[]> => {
    try {
      setLoading(true);
      
      // Filtra solo i dipendenti (esclude gli admin)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee') // Solo dipendenti, non admin
        .order('first_name');

      if (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i dipendenti",
          variant: "destructive",
        });
        return [];
      }

      // Type assertion to ensure compatibility
      const typedData = (data || []).map(employee => ({
        ...employee,
        role: employee.role as 'admin' | 'employee'
      }));

      return typedData;
    } catch (error) {
      console.error('Error in fetchEmployees:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: Partial<Employee>) => {
    try {
      setLoading(true);
      
      // Prepare data for insertion, ensuring proper format
      const insertData = {
        first_name: employeeData.first_name || null,
        last_name: employeeData.last_name || null,
        email: employeeData.email || null,
        role: 'employee' as const, // Force employee role
        department: employeeData.department || null,
        hire_date: employeeData.hire_date || null,
        employee_code: employeeData.employee_code || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Dipendente creato",
        description: "Il dipendente è stato aggiunto con successo",
      });

      return { data, error: null };
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

  const deleteEmployee = async (id: string) => {
    try {
      setLoading(true);
      
      // Elimina solo se è un dipendente (non admin)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
        .eq('role', 'employee'); // Elimina solo dipendenti

      if (error) throw error;

      toast({
        title: "Dipendente eliminato",
        description: "Il dipendente è stato rimosso dal sistema",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del dipendente",
        variant: "destructive",
      });
      return { error };
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
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus,
    loading,
    isLoading: loading // Add alias for backward compatibility
  };
};
