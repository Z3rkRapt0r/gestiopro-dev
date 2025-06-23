
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  department: string | null;
  hire_date: string | null;
  employee_code: string | null;
  is_active: boolean;
}

// Export EmployeeProfile as alias for backwards compatibility
export type EmployeeProfile = Employee;

export const useActiveEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Filtra solo i dipendenti attivi con ruolo 'employee' (esclude gli admin)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .eq('role', 'employee') // Solo dipendenti, non admin
        .order('first_name');

      if (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i dipendenti",
          variant: "destructive",
        });
        return;
      }

      // Type assertion to ensure compatibility
      const typedData = (data || []).map(employee => ({
        ...employee,
        role: employee.role as 'admin' | 'employee'
      }));

      setEmployees(typedData);
    } catch (error) {
      console.error('Error in fetchEmployees:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const refreshEmployees = () => {
    fetchEmployees();
  };

  return {
    employees,
    loading,
    refreshEmployees,
  };
};
