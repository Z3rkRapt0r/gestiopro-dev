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
  Eye,
  Trash2
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import DocumentPreview from "@/components/documents/DocumentPreview";
import DocumentUpload from "@/components/documents/DocumentUpload";
import { getDocumentTypeLabel, formatFileSize, formatDate } from "@/utils/documentUtils";

const AdminDocumentsSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  
  const { documents, downloadDocument, loading, refreshDocuments } = useDocuments();

  // Filtering and sorting logic for all documents
  const filteredAndSortedDocuments = documents
    .filter(doc => {
      const searchLower = searchTerm.toLowerCase();
      const titleMatch = doc.title.toLowerCase().includes(searchLower);
      const descMatch = doc.description?.toLowerCase().includes(searchLower) || false;
      const typeLabelMatch = getDocumentTypeLabel(doc.document_type).toLowerCase().includes(searchLower);
      // Tentativo di cercare anche per nome utente se l'info è disponibile o caricata separatamente
      // const userNameMatch = profiles.find(p => p.id === doc.user_id) ... (richiederebbe caricamento profili)

      const matchesSearch = titleMatch || descMatch || typeLabelMatch;
      
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

  const documentTypeStats = documents.reduce((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Gestione Documenti</h2>
          <DocumentUpload onSuccess={refreshDocuments} />
        </div>

        {/* Cards riassuntive */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Totali</p>
                  <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
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
                  <p className="text-sm font-medium text-gray-600">Utenti Attivi con Documenti</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(documents.filter(d => d.is_personal).map(doc => doc.user_id)).size}
                  </p>
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

        {/* Lista documenti */}
        <Card>
          <CardHeader>
            <CardTitle>
              Tutti i Documenti 
              {filteredAndSortedDocuments.length !== documents.length && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({filteredAndSortedDocuments.length} di {documents.length})
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
                    : 'I documenti caricati dagli utenti o per l\'azienda appariranno qui'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`p-3 rounded-lg group-hover:bg-blue-200 transition-colors ${doc.is_personal ? 'bg-blue-100' : 'bg-yellow-100 group-hover:bg-yellow-200'}`}>
                        <FileText className={`h-5 w-5 ${doc.is_personal ? 'text-blue-600' : 'text-yellow-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                        <div className="flex items-center space-x-2 md:space-x-4 mt-1 flex-wrap">
                          <p className="text-sm text-gray-600 whitespace-nowrap">
                            {formatDate(doc.created_at)}
                          </p>
                          <p className="text-sm text-gray-600 whitespace-nowrap">
                            {formatFileSize(doc.file_size)}
                          </p>
                          {doc.file_type && (
                            <p className="text-sm text-gray-500 uppercase whitespace-nowrap">
                              {doc.file_type.split('/')[1]}
                            </p>
                          )}
                          <p className={`text-sm whitespace-nowrap ${doc.is_personal ? 'text-blue-600' : 'text-yellow-700 font-medium'}`}>
                            {doc.is_personal ? `Utente: ${doc.user_id.slice(0, 8)}...` : 'Aziendale'}
                          </p>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-500 mt-1 truncate">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-3">
                      <Badge variant={doc.is_personal ? "outline" : "default"} className={`whitespace-nowrap ${!doc.is_personal && 'bg-yellow-500 hover:bg-yellow-600'}`}>
                        {getDocumentTypeLabel(doc.document_type)}
                      </Badge>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setPreviewDocument(doc)}
                        className="hover:bg-blue-50 h-8 w-8 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                        title="Anteprima"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => downloadDocument(doc)}
                        className="hover:bg-blue-50 h-8 w-8 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                        title="Scarica"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {/* TODO: Aggiungere opzione elimina per admin */}
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
