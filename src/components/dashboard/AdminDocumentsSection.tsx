
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

// Lista dei tipi documento NON PIÙ USATA QUI

type EmployeeProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
  role: string;
};

const AdminDocumentsSection = () => {
  const [employeeList, setEmployeeList] = useState<EmployeeProfile[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, is_active, role")
        .eq("role", "employee")
        .eq("is_active", true);
      if (data) setEmployeeList(data);
    }
    fetchEmployees();
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">Documenti Dipendenti</h2>
        <p className="text-gray-600 text-sm mb-4">
          Seleziona un dipendente per consultare e scaricare i suoi documenti personali.
        </p>
      </div>
      {employeeList.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
          Nessun dipendente attivo trovato.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {employeeList.map(emp => (
            <Card
              className="hover:shadow-lg transition cursor-pointer relative"
              key={emp.id}
              onClick={() => navigate(`/admin/documents/${emp.id}`)}
            >
              <CardContent className="flex items-center p-5 gap-4">
                <div className="rounded-full bg-blue-50 p-2">
                  <Users className="h-6 w-6 text-blue-800" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-lg text-gray-900">
                    {emp.first_name || ""} {emp.last_name || ""}
                  </span>
                  <span className="text-sm text-gray-500">{emp.email}</span>
                  <span className="text-xs text-green-700 font-semibold mt-1">
                    Attivo
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDocumentsSection;
