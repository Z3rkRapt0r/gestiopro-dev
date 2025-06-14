import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Download,
  Search,
  Filter,
  Users,
  Eye
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import DocumentPreview from "@/components/documents/DocumentPreview";
import DocumentUpload from "@/components/documents/DocumentUpload";
import { getDocumentTypeLabel, formatFileSize, formatDate } from "@/utils/documentUtils";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// Lista dei tipi documento
const documentTypesList = [
  { value: "payslip", label: "Busta Paga" },
  { value: "transfer", label: "Bonifico" },
  { value: "communication", label: "Comunicazione" },
  { value: "medical_certificate", label: "Certificato Medico" },
  { value: "leave_request", label: "Richiesta Ferie" },
  { value: "expense_report", label: "Nota Spese" },
  { value: "contract", label: "Contratto" },
  { value: "other", label: "Altro" },
];

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  const { documents, downloadDocument, loading, refreshDocuments } = useDocuments();

  // ---- Caricamento elenco dipendenti ----
  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, is_active, role")
        .eq("role", "employee")
        .eq("is_active", true);

      if (!error && data) {
        setEmployeeList(data);
        // Modificato: seleziona solo se data.length > 0
        if (data.length > 0 && (!selectedUserId || data.every(emp => emp.id !== selectedUserId))) {
          setSelectedUserId(data[0].id); // Preseleziona il primo
        }
      }
    }
    fetchEmployees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Filtro: documenti personali dipendente selezionato ----
  const selectedEmployee = employeeList.find(e => e.id === selectedUserId);

  const filteredPersonalDocs = documents
    .filter(doc =>
      doc.user_id === selectedUserId &&
      doc.is_personal // solo doc personali
    )
    .filter(doc => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        getDocumentTypeLabel(doc.document_type).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || doc.document_type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':
          return a.title.localeCompare(b.title);
        case 'name_desc':
          return b.title.localeCompare(a.title);
        case 'type':
          return getDocumentTypeLabel(a.document_type).localeCompare(getDocumentTypeLabel(b.document_type));
        default:
          return 0;
      }
    });

  // Group by type per accordion
  const groupedDocuments: Record<string, typeof filteredPersonalDocs> = {};
  filteredPersonalDocs.forEach((doc) => {
    const type = doc.document_type;
    if (!groupedDocuments[type]) groupedDocuments[type] = [];
    groupedDocuments[type].push(doc);
  });

  // Documenti aziendali (non personali)
  const companyDocs = documents.filter(doc => !doc.is_personal);

  // ---- Statistiche documento ----
  const documentTypeStats = filteredPersonalDocs.reduce((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Gestione Documenti Dipendenti</h2>
            <p className="text-gray-600 text-sm">Seleziona un dipendente per consultare e scaricare i suoi documenti personali.</p>
          </div>
          <div className="w-full md:w-80">
            <Select
              value={employeeList.length > 0 ? selectedUserId ?? employeeList[0].id : "__no_employee__"}
              onValueChange={val => {
                if (val !== "__no_employee__") setSelectedUserId(val);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={"Seleziona dipendente"} />
              </SelectTrigger>
              <SelectContent>
                {employeeList.length === 0 ? (
                  <SelectItem value="__no_employee__" disabled>Nessun dipendente</SelectItem>
                ) : (
                  employeeList.map(emp =>
                    <SelectItem value={emp.id} key={emp.id}>
                      {emp.first_name || ''} {emp.last_name || ''} ({emp.email})
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <DocumentUpload onSuccess={refreshDocuments} />
        </div>

        {/* Cards riassuntive */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Totali</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredPersonalDocs.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Buste Paga</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {documentTypeStats.payslip || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comunicazioni</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {documentTypeStats.communication || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dipendente attivo</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedEmployee ? 'Sì' : 'No'}</p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtri e ricerca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtri e Ricerca Documenti Personali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Cerca documenti..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Tipo documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  {documentTypesList.map(d =>
                    <SelectItem value={d.value} key={d.value}>{d.label}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Data (più recente)</SelectItem>
                  <SelectItem value="date_asc">Data (più vecchio)</SelectItem>
                  <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
                  <SelectItem value="type">Tipo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Accordion blocchi per tipo documento */}
        <Card>
          <CardHeader>
            <CardTitle>
              Documenti Personali di {selectedEmployee ? `${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}` : "(Seleziona dipendente)"}
              {filteredPersonalDocs.length !== 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({filteredPersonalDocs.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Caricamento documenti...</p>
              </div>
            ) : filteredPersonalDocs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {searchTerm || filterType !== 'all'
                    ? 'Nessun documento trovato'
                    : 'Nessun documento personale per questo dipendente'}
                </h3>
                <p className="mt-2 text-gray-500">
                  {searchTerm || filterType !== 'all'
                    ? 'Prova a modificare i filtri di ricerca'
                    : 'Carica o assegna il primo documento'}
                </p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {documentTypesList
                  .filter(typeItem => groupedDocuments[typeItem.value] && groupedDocuments[typeItem.value].length > 0)
                  .map(typeItem => (
                    <AccordionItem value={typeItem.value} key={typeItem.value} className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-3 text-lg font-semibold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span>{typeItem.label}</span>
                          <Badge variant="secondary" className="ml-2">
                            {groupedDocuments[typeItem.value].length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 py-2">
                        <div className="space-y-3">
                          {groupedDocuments[typeItem.value].map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between px-2 py-2 border rounded-lg hover:bg-gray-50 transition-colors group">
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                                  <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                                  <div className="flex items-center space-x-4 mt-1">
                                    <p className="text-sm text-gray-600">
                                      {formatDate(doc.created_at)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {formatFileSize(doc.file_size)}
                                    </p>
                                    {doc.file_type && (
                                      <p className="text-sm text-gray-500 uppercase">
                                        {doc.file_type.split('/')[1]}
                                      </p>
                                    )}
                                  </div>
                                  {doc.description && (
                                    <p className="text-sm text-gray-500 mt-1 truncate">{doc.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className="whitespace-nowrap">
                                  {getDocumentTypeLabel(doc.document_type)}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPreviewDocument(doc)}
                                  className="hover:bg-blue-50"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadDocument(doc)}
                                  className="hover:bg-blue-50"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                }
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Blocchi documenti aziendali */}
        <Card>
          <CardHeader>
            <CardTitle>Documenti Aziendali (visibili a tutti gli utenti)</CardTitle>
          </CardHeader>
          <CardContent>
            {companyDocs.length === 0 ? (
              <div className="text-center text-gray-500">Nessun documento aziendale presente.</div>
            ) : (
              <div className="space-y-3">
                {companyDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-yellow-50 transition-colors group">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-yellow-100 p-3 rounded-lg group-hover:bg-yellow-200 transition-colors">
                        <FileText className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                        <div className="flex items-center space-x-2 md:space-x-4 mt-1 flex-wrap">
                          <p className="text-sm text-gray-600 whitespace-nowrap">{formatDate(doc.created_at)}</p>
                          <p className="text-sm text-gray-600 whitespace-nowrap">{formatFileSize(doc.file_size)}</p>
                          {doc.file_type && (
                            <p className="text-sm text-gray-500 uppercase whitespace-nowrap">{doc.file_type.split('/')[1]}</p>
                          )}
                          <span className="text-sm text-yellow-900 font-medium whitespace-nowrap">Aziendale</span>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-500 mt-1 truncate">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-3">
                      <Badge variant="default" className="whitespace-nowrap bg-yellow-500 hover:bg-yellow-600">
                        {getDocumentTypeLabel(doc.document_type)}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPreviewDocument(doc)}
                        className="hover:bg-yellow-50 h-8 w-8 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                        title="Anteprima"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => downloadDocument(doc)}
                        className="hover:bg-yellow-50 h-8 w-8 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                        title="Scarica"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DocumentPreview
        document={previewDocument}
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        onDownload={downloadDocument}
      />
    </>
  );
};

export default AdminDocumentsSection;
