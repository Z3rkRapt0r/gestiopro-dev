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

  // Nuova suddivisione in blocchi per tipo
  const groupedDocuments: Record<string, typeof filteredAndSortedDocuments> = {};
  filteredAndSortedDocuments.forEach((doc) => {
    const type = doc.document_type;
    if (!groupedDocuments[type]) groupedDocuments[type] = [];
    groupedDocuments[type].push(doc);
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">I Miei Documenti</h2>
          <DocumentUpload onSuccess={() => {}} />
        </div>

        {/* Cards riassuntive */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Buste Paga</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {documentTypeStats.payslip || 0}
                  </p>
                </div>
                <Euro className="h-8 w-8 text-green-600" />
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
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Totali</p>
                  <p className="text-2xl font-bold text-gray-900">{myDocuments.length}</p>
                </div>
                <Upload className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ultimo</p>
                  <p className="text-sm font-bold text-gray-900">
                    {myDocuments.length > 0 
                      ? formatDate(myDocuments[0].created_at).split(' ')[0]
                      : 'Nessuno'
                    }
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtri e ricerca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtri e Ricerca
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
                  <SelectItem value="payslip">Buste Paga</SelectItem>
                  <SelectItem value="communication">Comunicazioni</SelectItem>
                  <SelectItem value="medical_certificate">Certificati Medici</SelectItem>
                  <SelectItem value="leave_request">Richieste Ferie</SelectItem>
                  <SelectItem value="expense_report">Note Spese</SelectItem>
                  <SelectItem value="contract">Contratti</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
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

        {/* Lista documenti suddivisi per tipo */}
        <Card>
          <CardHeader>
            <CardTitle>
              Documenti Personali
              {filteredAndSortedDocuments.length !== myDocuments.length && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({filteredAndSortedDocuments.length} di {myDocuments.length})
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
              // Blocchi separati per tipo
              <div className="space-y-8">
                {documentTypesList
                  .filter(typeItem => groupedDocuments[typeItem.value] && groupedDocuments[typeItem.value].length > 0)
                  .map(typeItem => (
                    <div key={typeItem.value}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg text-gray-800">{typeItem.label}</span>
                        <Badge variant="secondary" className="ml-2">
                          {groupedDocuments[typeItem.value].length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {groupedDocuments[typeItem.value].map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors group">
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
                    </div>
                  ))
                }
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

export default DocumentsSection;
