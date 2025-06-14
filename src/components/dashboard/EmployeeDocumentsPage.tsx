
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import { getDocumentTypeLabel, formatFileSize, formatDate } from "@/utils/documentUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Eye, Download, ChevronLeft, Filter, Search, Upload } from "lucide-react";
import DocumentPreview from "@/components/documents/DocumentPreview";
import DocumentUpload from "@/components/documents/DocumentUpload";

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

export default function EmployeeDocumentsPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const { documents, downloadDocument, loading, refreshDocuments } = useDocuments();
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  // Modifica: aggiungiamo stato per ricerca e filtro
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Stato per mostrare upload dialog
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    async function fetchEmployee() {
      if (!employeeId) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, is_active, role")
        .eq("id", employeeId)
        .maybeSingle();
      setEmployee(data || null);
    }
    fetchEmployee();
  }, [employeeId]);

  // Documenti personali di questo dipendente
  const filteredPersonalDocs = documents
    .filter(doc => doc.user_id === employeeId && doc.is_personal);

  // Filtro per ricerca testo e tipo documento
  const docsAfterFilter = useMemo(() => {
    let docs = filteredPersonalDocs;

    // Filtro per tipo documento, se selezionato
    if (typeFilter) {
      docs = docs.filter(doc => doc.document_type === typeFilter);
    }

    // Filtro per testo su titolo o descrizione
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      docs = docs.filter(doc =>
        doc.title?.toLowerCase().includes(lowerSearch) ||
        doc.description?.toLowerCase().includes(lowerSearch)
      );
    }

    return docs;
  }, [filteredPersonalDocs, typeFilter, search]);

  // Raggruppa per tipo SOLO tra quelli filtrati
  const groupedDocuments: Record<string, typeof docsAfterFilter> = {};
  docsAfterFilter.forEach((doc) => {
    const type = doc.document_type;
    if (!groupedDocuments[type]) groupedDocuments[type] = [];
    groupedDocuments[type].push(doc);
  });

  if (!employeeId) return <div className="p-8">ID dipendente non valido.</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin?section=documents")}
        className="mb-4 flex items-center gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna all'elenco dipendenti
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle>
              Documenti personali di{" "}
              <span className="font-bold">
                {employee
                  ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
                  : "Dipendente"}
              </span>
            </CardTitle>
            {/* Pulsante upload */}
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Upload className="mr-2 h-4 w-4" />
              Carica Documento per {employee ? employee.first_name : 'lui/lei'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra di ricerca + filtro */}
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <div className="flex-1 flex items-center bg-white rounded border px-2">
              <Search className="text-gray-400 mr-2 w-4 h-4" />
              <Input
                className="border-0 shadow-none px-2 focus-visible:ring-0"
                placeholder="Cerca per titolo o descrizione..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-1 text-gray-400" />
                <SelectValue placeholder="Tutti i tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutti i tipi</SelectItem>
                {documentTypesList.map(typeItem => (
                  <SelectItem key={typeItem.value} value={typeItem.value}>
                    {typeItem.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Caricamento documenti...</p>
            </div>
          ) : docsAfterFilter.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Nessun documento personale per questo dipendente
              </h3>
              <p className="mt-2 text-gray-500">
                Al momento non sono presenti documenti che corrispondono ai filtri.
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
                                  <p className="text-sm text-gray-600">{formatDate(doc.created_at)}</p>
                                  <p className="text-sm text-gray-600">{formatFileSize(doc.file_size)}</p>
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

      {/* Modale di upload dedicata al dipendente */}
      {employeeId && (
        <DocumentUpload
          onSuccess={() => {
            setShowUpload(false);
            refreshDocuments();
          }}
          // Configura modalità caricamento per un utente specifico
          // Con queste props il documento sarà personale per il dipendente corrente
          userId={employeeId}
          isPersonal
          open={showUpload}
          setOpen={setShowUpload}
        />
      )}

      <DocumentPreview
        document={previewDocument}
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        onDownload={downloadDocument}
      />
    </div>
  );
}

