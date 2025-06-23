
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  employee_code: string | null;
  is_active: boolean;
}

export function useActiveEmployees() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      console.log('Fetching employees dopo database reset...');
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, employee_code, is_active")
        .eq("is_active", true);
        
      if (error) {
        console.error('Error fetching employees:', error);
      } else {
        console.log('Dipendenti caricati dopo reset:', data?.length || 0);
        setEmployees((data || []) as EmployeeProfile[]);
      }
      
      setLoading(false);
    };
    
    fetchEmployees();
    
    // Ricarica automatico ogni 5 secondi dopo il reset per vedere subito i cambiamenti
    const interval = setInterval(fetchEmployees, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return { employees, loading };
}
