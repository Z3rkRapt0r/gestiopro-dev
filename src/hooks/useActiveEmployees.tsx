
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export function useActiveEmployees() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("is_active", true)
      .then(({ data }) => {
        setEmployees((data || []) as EmployeeProfile[]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { employees, loading };
}
