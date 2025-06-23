
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

export const useEmployeeFetch = () => {
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

  return {
    fetchEmployees,
    loading,
    isLoading: loading
  };
};
