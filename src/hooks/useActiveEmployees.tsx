
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  department: string | null;
  employee_code: string | null;
  is_active: boolean;
}

export function useActiveEmployees() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    setLoading(true);
    console.log('Fetching employees...');
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, department, employee_code, is_active")
      .eq("is_active", true)
      .order('first_name', { ascending: true });
    
    if (error) {
      console.error('Errore nel caricamento dipendenti:', error);
    } else {
      console.log('Dipendenti caricati:', data?.length || 0);
    }
    
    setEmployees((data || []) as EmployeeProfile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Funzione per ricaricare manualmente i dipendenti
  const refetchEmployees = () => {
    return fetchEmployees();
  };

  return { employees, loading, refetchEmployees };
}
