
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Upload, 
  Search, 
  FileText, 
  Trash2, 
  Eye, 
  Download, 
  Filter, 
  Calendar,
  Euro,
  Building,
  UserCheck,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  MoreHorizontal,
  Plus
} from "lucide-react";
import DocumentUploadDialogController from "@/components/documents/DocumentUploadDialogController";
import { useDocuments } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/documentUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EmployeeProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
  role: string;
  department?: string | null;
};

type EmployeeWithStats = EmployeeProfile & {
  documentCount: number;
  lastDocument: any | null;
  documentTypes: Record<string, number>;
};

type ViewMode = 'grid' | 'table';

const AdminDocumentsSection = () => {
  const [employeeList, setEmployeeList] = useState<EmployeeProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<'name' | 'documents' | 'lastDocument'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { documents, deleteDocument, refreshDocuments } = useDocuments();
  const { toast } = useToast();

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
      if (data) {
        setEmployeeList(data);
        // Inizializza filteredEmployees con il tipo corretto
        const employeesWithStats = data.map(emp => ({
          ...emp,
          documentCount: 0,
          lastDocument: null,
          documentTypes: {}
        }));
        setFilteredEmployees(employeesWithStats);
      }
    }
    fetchEmployees();
  }, []);



  // Calcola statistiche per ogni dipendente
  const employeesWithStats: EmployeeWithStats[] = useMemo(() => {
    return employeeList.map(emp => {
      const employeeDocs = documents.filter(doc => doc.user_id === emp.id && doc.is_personal);
      const lastDocument = employeeDocs.length > 0 
        ? employeeDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null;
      
      return {
        ...emp,
        documentCount: employeeDocs.length,
        lastDocument,
        documentTypes: employeeDocs.reduce((acc, doc) => {
          acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    });
  }, [employeeList, documents]);



  // Filtraggio intelligente
  useEffect(() => {
    let result = employeesWithStats;
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


    // Ordinamento
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
             switch (sortField) {
         case 'name':
           aValue = `${a.first_name ?? ""} ${a.last_name ?? ""}`.toLowerCase();
           bValue = `${b.first_name ?? ""} ${b.last_name ?? ""}`.toLowerCase();
           break;
         case 'documents':
           aValue = a.documentCount;
           bValue = b.documentCount;
           break;
         case 'lastDocument':
           aValue = a.lastDocument?.created_at ?? "";
           bValue = b.lastDocument?.created_at ?? "";
           break;
         default:
           aValue = a.first_name ?? "";
           bValue = b.first_name ?? "";
       }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredEmployees(result);
  }, [employeesWithStats, search, sortField, sortDirection, documents]);

  const handleDeleteDocument = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      const result = await deleteDocument(doc);
      if (!result.error) {
        await refreshDocuments();
        toast({
          title: "Documento eliminato",
          description: "Il documento è stato eliminato con successo",
        });
      }
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header con titolo e azioni */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Documenti Dipendenti</h2>
          <p className="text-gray-600 text-sm">
            Gestisci e consulta i documenti personali di tutti i dipendenti
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <DocumentUploadDialogController 
            trigger={
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Carica Documento
              </Button>
            }
          />
        </div>
      </div>



      {/* FILTRI & SEARCHBAR */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtri e Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Ricerca</label>
            <div className="relative">
              <Input
                placeholder="Cerca dipendente, email o documento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CONTENUTO PRINCIPALE */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun dipendente trovato</h3>
            <p className="text-gray-500">Prova a modificare i filtri di ricerca</p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        // VISTA TABELLA
        <Card>
          <CardHeader>
            <CardTitle>Elenco Dipendenti</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('name')}
                      className="h-auto p-0 font-semibold"
                    >
                      Dipendente
                      <SortIcon field="name" />
                    </Button>
                  </TableHead>
                  
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('documents')}
                      className="h-auto p-0 font-semibold"
                    >
                      Documenti
                      <SortIcon field="documents" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('lastDocument')}
                      className="h-auto p-0 font-semibold"
                    >
                      Ultimo Documento
                      <SortIcon field="lastDocument" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(emp => (
                  <TableRow key={emp.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {emp.first_name || ""} {emp.last_name || ""}
                          </div>
                          <div className="text-sm text-gray-500">{emp.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={emp.documentCount > 0 ? "default" : "secondary"}>
                          {emp.documentCount} documenti
                        </Badge>
                        {emp.documentCount > 0 && (
                          <div className="flex space-x-1">
                            {Object.entries(emp.documentTypes).slice(0, 3).map(([type, count]) => (
                              <div key={type} className="w-2 h-2 bg-blue-400 rounded-full" title={`${type}: ${count}`} />
                            ))}
                            {Object.keys(emp.documentTypes).length > 3 && (
                              <div className="w-2 h-2 bg-gray-300 rounded-full" title="Altri tipi" />
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.lastDocument ? (
                        <div className="text-sm text-gray-600">
                          {formatDate(emp.lastDocument.created_at)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Nessun documento</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          onClick={() => window.location.assign(`/admin/documents/${emp.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visualizza
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.assign(`/admin/documents/${emp.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizza Documenti
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Upload className="h-4 w-4 mr-2" />
                              Carica Documento
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        // VISTA GRIGLIA
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(emp => (
            <Card
              key={emp.id}
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => window.location.assign(`/admin/documents/${emp.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant={emp.documentCount > 0 ? "default" : "secondary"}>
                    {emp.documentCount} doc
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                    {emp.first_name || ""} {emp.last_name || ""}
                  </h3>
                  <p className="text-sm text-gray-600">{emp.email}</p>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Building className="h-4 w-4" />
                    <span>{emp.department || "N/D"}</span>
                  </div>

                  {emp.documentCount > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-medium text-gray-700">Tipi di documento:</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(emp.documentTypes).slice(0, 3).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}: {count}
                          </Badge>
                        ))}
                        {Object.keys(emp.documentTypes).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(emp.documentTypes).length - 3} altri
                          </Badge>
                        )}
                      </div>
                      
                      {emp.lastDocument && (
                        <div className="text-xs text-gray-500 flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Ultimo: {formatDate(emp.lastDocument.created_at)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.assign(`/admin/documents/${emp.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizza Documenti
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Widget documenti recenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ultimi Documenti Caricati
          </CardTitle>
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
                <div key={doc.id} className="flex justify-between items-center py-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{doc.title}</div>
                      <div className="text-sm text-gray-500">
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{doc.document_type}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDocumentsSection;
