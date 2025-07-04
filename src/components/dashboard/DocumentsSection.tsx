import { useState } from "react";
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
  Calendar,
  Euro,
  Upload,
  Eye
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import DocumentUpload from "@/components/documents/DocumentUpload";
import DocumentPreview from "@/components/documents/DocumentPreview";
import { getDocumentTypeLabel, formatFileSize, formatDate } from "@/utils/documentUtils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import DocumentUploadDialogController from "@/components/documents/DocumentUploadDialogController";

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

const DocumentsSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  
  const { profile } = useAuth();
  const { documents, downloadDocument, loading } = useDocuments();

  const myDocuments = documents.filter(doc => doc.user_id === profile?.id);

  // Filtering and sorting logic
  const filteredAndSortedDocuments = myDocuments
    .filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const documentTypeStats = myDocuments.reduce((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Nuova suddivisione in blocchi per tipo (accordion)
  const groupedDocuments: Record<string, typeof filteredAndSortedDocuments> = {};
  filteredAndSortedDocuments.forEach((doc) => {
    const type = doc.document_type;
    if (!groupedDocuments[type]) groupedDocuments[type] = [];
    groupedDocuments[type].push(doc);
  });

  return (
    <>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">I Miei Documenti</h2>
          <DocumentUploadDialogController
            trigger={
              <Button className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base">
                <Upload className="h-4 w-4 mr-2" />
                Carica Documento
              </Button>
            }
          />
        </div>

        {/* Cards riassuntive */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Buste Paga</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{documentTypeStats.payslip || 0}</p>
                </div>
                <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Comunicazioni</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">
                    {documentTypeStats.communication || 0}
                  </p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Totali</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{myDocuments.length}</p>
                </div>
                <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Ultimo</p>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                    {myDocuments.length > 0 
                      ? formatDate(myDocuments[0].created_at).split(' ')[0]
                      : 'Nessuno'
                    }
                  </p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtri e ricerca */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filtri e Ricerca
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Cerca documenti..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 min-h-[44px] text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-48 min-h-[44px] text-sm sm:text-base">
                  <SelectValue placeholder="Tipo documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="payslip">Buste Paga</SelectItem>
                  <SelectItem value="transfer">Bonifici</SelectItem>
                  <SelectItem value="communication">Comunicazioni</SelectItem>
                  <SelectItem value="medical_certificate">Certificati Medici</SelectItem>
                  <SelectItem value="leave_request">Richieste Ferie</SelectItem>
                  <SelectItem value="expense_report">Note Spese</SelectItem>
                  <SelectItem value="contract">Contratti</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48 min-h-[44px] text-sm sm:text-base">
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
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">
              Documenti Personali
              {filteredAndSortedDocuments.length !== myDocuments.length && (
                <span className="text-xs sm:text-sm font-normal text-gray-600 ml-2">
                  ({filteredAndSortedDocuments.length} di {myDocuments.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Caricamento documenti...</p>
              </div>
            ) : filteredAndSortedDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {searchTerm || filterType !== 'all' ? 'Nessun documento trovato' : 'Nessun documento'}
                </h3>
                <p className="mt-2 text-gray-500">
                  {searchTerm || filterType !== 'all' 
                    ? 'Prova a modificare i filtri di ricerca'
                    : 'Carica il tuo primo documento per iniziare'
                  }
                </p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-3 sm:space-y-4">
                {documentTypesList
                  .filter(typeItem => groupedDocuments[typeItem.value] && groupedDocuments[typeItem.value].length > 0)
                  .map(typeItem => (
                    <AccordionItem value={typeItem.value} key={typeItem.value} className="border rounded-lg">
                      <AccordionTrigger className="px-3 sm:px-4 py-3 text-base sm:text-lg font-semibold flex items-center justify-between gap-2 min-h-[44px]">
                        <div className="flex items-center gap-2">
                          <span>{typeItem.label}</span>
                          <Badge variant="secondary" className="ml-2">
                            {groupedDocuments[typeItem.value].length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 sm:px-3 py-2">
                        <div className="space-y-2 sm:space-y-3">
                          {groupedDocuments[typeItem.value].map((doc) => (
                            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-3 border rounded-lg hover:bg-gray-50 transition-colors group gap-3 sm:gap-4">
                              <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                                <div className="bg-blue-100 p-2 sm:p-3 rounded-lg group-hover:bg-blue-200 transition-colors flex-shrink-0">
                                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">{doc.title}</h3>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                                    <p className="text-xs sm:text-sm text-gray-600">
                                      {formatDate(doc.created_at)}
                                    </p>
                                    <p className="text-xs sm:text-sm text-gray-600">
                                      {formatFileSize(doc.file_size)}
                                    </p>
                                    {doc.file_type && (
                                      <p className="text-xs sm:text-sm text-gray-500 uppercase">
                                        {doc.file_type.split('/')[1]}
                                      </p>
                                    )}
                                  </div>
                                  {doc.description && (
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{doc.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {getDocumentTypeLabel(doc.document_type)}
                                </Badge>
                                <div className="flex gap-1 sm:gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => setPreviewDocument(doc)}
                                    className="hover:bg-blue-50 min-h-[44px] min-w-[44px] p-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => downloadDocument(doc)}
                                    className="hover:bg-blue-50 min-h-[44px] min-w-[44px] p-2"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
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

export default DocumentsSection;
