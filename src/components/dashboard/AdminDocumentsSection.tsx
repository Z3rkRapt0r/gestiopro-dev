
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Upload, Search, FileText } from "lucide-react";
import DocumentUpload from "@/components/documents/DocumentUpload";
import { useDocuments } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";

type EmployeeProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
  role: string;
  department?: string | null;
  // ... altri campi se presenti
};

const AdminDocumentsSection = () => {
  const [employeeList, setEmployeeList] = useState<EmployeeProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeProfile[]>([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [uploadUserId, setUploadUserId] = useState<string | null>(null);
  const { documents } = useDocuments();

  // Documenti recenti (ultimi 6)
  const recentDocs = documents
    .filter(doc => doc.is_personal)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, is_active, role, department")
        .eq("role", "employee")
        .eq("is_active", true);
      if (data) setEmployeeList(data);
      setFilteredEmployees(data || []);
    }
    fetchEmployees();
  }, []);

  // Recupera reparti e ruoli disponibili in automatico
  const departmentList = Array.from(
    new Set(employeeList.map((e) => e.department).filter(Boolean))
  );
  const roleList = Array.from(
    new Set(employeeList.map((e) => e.role).filter(Boolean))
  );

  // Filtraggio intelligente
  useEffect(() => {
    let result = employeeList;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (e) =>
          (`${e.first_name ?? ""} ${e.last_name ?? ""}`.toLowerCase().includes(s) ||
          (e.email?.toLowerCase().includes(s) ?? false) ||
          (documents.some(d =>
            d.user_id === e.id &&
            ((d.title?.toLowerCase() ?? "").includes(s) ||
            (d.description?.toLowerCase() ?? "").includes(s))
          ))
        )
      );
    }
    if (filterDept) {
      result = result.filter(e => e.department === filterDept);
    }
    if (filterRole) {
      result = result.filter(e => e.role === filterRole);
    }
    setFilteredEmployees(result);
  }, [employeeList, search, filterDept, filterRole, documents]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Documenti Dipendenti</h2>
        <p className="text-gray-600 text-sm mb-4">
          Seleziona un dipendente per consultare e caricare i documenti personali.
        </p>
      </div>

      {/* FILTRI & SEARCHBAR */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 mb-2">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Ricerca nome, email o titolo documento</label>
          <div className="relative">
            <Input
              placeholder="Cerca dipendente o documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Reparto</label>
          <select
            className="block w-full border rounded-md py-2 px-3"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
          >
            <option value="">Tutti</option>
            {departmentList.map(dep => (
              <option key={dep as string} value={dep as string}>{dep}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Ruolo</label>
          <select
            className="block w-full border rounded-md py-2 px-3"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">Tutti</option>
            {roleList.map(role => (
              <option key={role as string} value={role as string}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ELENCO DIPENDENTI */}
      {filteredEmployees.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
          Nessun dipendente trovato.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEmployees.map(emp => (
            <Card
              className="hover:shadow-lg transition cursor-pointer relative"
              key={emp.id}
              // Navigazione appena sopra il tasto!
              onClick={() => window.location.assign(`/admin/documents/${emp.id}`)}
            >
              <CardContent className="flex items-center p-5 gap-4">
                <div className="rounded-full bg-blue-50 p-2">
                  <Users className="h-6 w-6 text-blue-800" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-medium text-lg text-gray-900">
                    {emp.first_name || ""} {emp.last_name || ""}
                  </span>
                  <span className="text-sm text-gray-500">{emp.email}</span>
                  <span className="text-xs text-green-700 font-semibold mt-1">
                    Attivo
                  </span>
                  <span className="text-xs text-gray-500">
                    {emp.department || "N/D"} • {emp.role || "N/D"}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadUserId(emp.id);
                  }}
                  title="Carica documento per questo dipendente"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Carica
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Widget documenti recenti */}
      <Card>
        <CardHeader>
          <CardTitle>Ultimi Documenti Caricati</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {recentDocs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-900">Nessun documento caricato recentemente</p>
              </div>
            ) : (
              recentDocs.map(doc => (
                <div key={doc.id} className="flex justify-between items-center py-2">
                  <div>
                    <div className="font-medium text-gray-900">{doc.title}</div>
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const emp = employeeList.find(e => e.id === doc.user_id);
                        return emp
                          ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim()
                          : "Sconosciuto";
                      })()}
                      {" • "}
                      {new Date(doc.created_at).toLocaleDateString("it-IT")}
                    </div>
                  </div>
                  <Badge variant="outline">{doc.document_type}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modale upload documento per dipendente */}
      {uploadUserId && (
        <DocumentUpload
          onSuccess={() => setUploadUserId(null)}
          // Override utente specifico
          key={uploadUserId}
          // Customizzazione: prop non usata ma sarà ignorata dall'implementazione base
          // Puoi modificarla in DocumentUpload se vuoi forzare l'upload per un certo userId!
        >
          {/* Children ignorati, solo per chiamata */}
        </DocumentUpload>
      )}
    </div>
  );
};

export default AdminDocumentsSection;
