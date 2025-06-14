import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Bell, 
  LogOut, 
  Settings,
  TrendingUp,
  Download,
  Upload,
  Search,
  UserPlus
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateEmployeeForm from "./CreateEmployeeForm";
import EditEmployeeForm from "./EditEmployeeForm";
import AdminDocumentsSection from "./AdminDocumentsSection";
import AdminNotificationsSection from "./AdminNotificationsSection";
import NotificationForm from "@/components/notifications/NotificationForm";
import NotificationsList from "@/components/notifications/NotificationsList";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  department: string | null;
  employee_code: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const AdminDashboard = () => {
  const [searchParams] = typeof window !== "undefined" ? [new URLSearchParams(window.location.search)] : [new URLSearchParams()];
  const sectionFromQuery = searchParams.get("section");
  const [activeSection, setActiveSection] = useState(sectionFromQuery === "documents" ? "documents" : "dashboard");
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  // --- NEW: Real documents & notifications state ---
  const [documents, setDocuments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  // Funzione per raggruppare documenti per mese (ultimi 12 mesi)
  function getMonthlyDocumentsStats(documents: any[]) {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return {
        name: d.toLocaleString('it-IT', { month: 'short' }),
        value: 0,
        year: d.getFullYear(),
        month: d.getMonth(),
      };
    });

    documents.forEach((doc) => {
      if (!doc.created_at) return;
      const d = new Date(doc.created_at);
      const found = months.find(
        (m) => m.year === d.getFullYear() && m.month === d.getMonth()
      );
      if (found) found.value++;
    });

    return months.map((m) => ({
      name: m.name,
      documents: m.value,
    }));
  }

  // Calcolo status dipendenti dinamico
  const totalActive = employees.filter(e => e.is_active).length;
  const totalInactive = employees.length - totalActive;
  // Possibili future espansioni: ferie, assenti (se dati disponibili)

  const employeeStatusData = [
    { name: 'Attivi', value: totalActive, color: '#3b82f6' },
    { name: 'Inattivi', value: totalInactive, color: '#f59e0b' },
  ];

  // Documenti mensili reali
  const monthlyDocumentsData = getMonthlyDocumentsStats(documents);

  // Attività recenti: ultimi 4 documenti reali
  const recentDocuments = documents
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)
    .map((doc) => ({
      id: doc.id,
      name: doc.title || doc.file_name,
      employee: (() => {
        // Ricerca nome dipendente se disponibile dall'elenco employees
        const emp = employees.find(e => e.id === doc.user_id);
        return emp ? `${emp.first_name ?? '-'} ${emp.last_name ?? ''}`.trim() : "Sconosciuto";
      })(),
      date: new Date(doc.created_at).toLocaleDateString('it-IT'),
      type: doc.document_type,
    }));

  // --- FETCH EMPLOYEES ---
  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const fetchedEmployees = (data || []).map(emp => ({
        ...emp,
        role: emp.role as 'admin' | 'employee',
        is_active: emp.is_active ?? true
      })) as Employee[];
      setEmployees(fetchedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei dipendenti",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // --- NEW: FETCH DOCUMENTS ---
  const fetchDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // --- NEW: FETCH NOTIFICATIONS ---
  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'employees' || activeSection === 'dashboard') {
      fetchEmployees();
      fetchDocuments();
      fetchNotifications();
    }
  }, [activeSection]);

  const handleEmployeeCreated = () => {
    fetchEmployees();
    setShowCreateEmployee(false);
  };

  const handleEmployeeUpdated = () => {
    fetchEmployees();
    setEmployeeToEdit(null);
  };

  // --- STATISTICHE REALISTICHE ---
  const totalEmployees = employees.length;
  // Documents for the current month
  const currentMonth = new Date().getMonth();
  const documentsThisMonth = documents.filter(doc => {
    if (!doc.created_at) return false;
    const docDate = new Date(doc.created_at);
    return docDate.getMonth() === currentMonth && docDate.getFullYear() === new Date().getFullYear();
  }).length;
  // Unread notifications
  const pendingNotifications = notifications.filter(n => n.is_read === false).length;

  // Performance: rapporto documenti/mese / dipendenti
  let performance: string | number = "N/D";
  if (totalEmployees > 0) {
    performance = Math.min(100, Math.round((documentsThisMonth / totalEmployees) * 100));
    if (isNaN(performance)) performance = "N/D";
    else performance = `${performance}%`;
  }

  // Aggiorna il renderDashboard in modo che usi i dati dinamici
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Cards statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dipendenti Totali</p>
                <p className="text-2xl font-bold text-gray-900">{isLoadingEmployees ? '-' : totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documenti Mese</p>
                <p className="text-2xl font-bold text-gray-900">{isLoadingDocuments ? '-' : documentsThisMonth}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Notifiche Pending</p>
                <p className="text-2xl font-bold text-gray-900">{isLoadingNotifications ? '-' : pendingNotifications}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance</p>
                <p className="text-2xl font-bold text-gray-900">{performance}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico Documenti Mensili */}
        <Card>
          <CardHeader>
            <CardTitle>Documenti Mensili</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyDocumentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="documents" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grafico Status Dipendenti */}
        <Card>
          <CardHeader>
            <CardTitle>Status Dipendenti</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={employeeStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {employeeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {employeeStatusData.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documenti recenti reali */}
      <Card>
        <CardHeader>
          <CardTitle>Attività Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-600">{doc.employee} • {doc.date}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{doc.type}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => {
                    // Download file (usa la funzione helper del documento se disponibile)
                    window.open(`/api/documents/download/${doc.id}`, "_blank");
                  }}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {recentDocuments.length === 0 && (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun documento recente</h3>
                <p className="mt-1 text-sm text-gray-500">Quando saranno caricati documenti, li vedrai qui.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestione Dipendenti</h2>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowCreateEmployee(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Aggiungi Dipendente
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoadingEmployees ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Caricamento dipendenti...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {employee.department || 'Nessun dipartimento'}
                      </span>
                      {employee.employee_code && (
                        <span className="text-xs text-gray-500">
                          Codice: {employee.employee_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={employee.role === 'admin' ? 'default' : 'secondary'}
                      className={employee.role === 'admin' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
                    >
                      {employee.role === 'admin' ? 'Admin' : 'Dipendente'}
                    </Badge>
                    <Badge 
                      variant={employee.is_active ? 'default' : 'secondary'}
                      className={employee.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}
                    >
                      {employee.is_active ? 'Attivo' : 'Inattivo'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEmployeeToEdit(employee)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {employees.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun dipendente</h3>
                  <p className="mt-1 text-sm text-gray-500">Inizia aggiungendo il primo dipendente</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Aggiorna activeSection se cambia query param
  useEffect(() => {
    if (sectionFromQuery && sectionFromQuery !== activeSection) {
      setActiveSection(sectionFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionFromQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">SerramentiCorp Admin</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Benvenuto, {profile?.first_name} {profile?.last_name}
              </span>
              <Button variant="ghost" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar */}
          <div className="w-64 space-y-2">
            <Button
              variant={activeSection === 'dashboard' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('dashboard')}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            
            <Button
              variant={activeSection === 'employees' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('employees')}
            >
              <Users className="mr-2 h-4 w-4" />
              Dipendenti
            </Button>
            
            <Button
              variant={activeSection === 'documents' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('documents')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Documenti
            </Button>
            
            <Button
              variant={activeSection === 'notifications' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifiche
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'employees' && renderEmployees()}
            {activeSection === 'documents' && <AdminDocumentsSection />}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Invia nuova notifica</h2>
                <NotificationForm onCreated={() => {/* force refresh notifications list logic */}} />
                <h3 className="text-xl font-semibold mt-8">Notifiche inviate</h3>
                <NotificationsList
                  // le notifiche possono essere passate da state/prop/fetch
                  notifications={notifications}
                  adminView
                  onDelete={async (id) => {
                    // elimina da Supabase
                    await supabase.from("notifications").delete().eq("id", id);
                    // TODO: remove file attachment if present
                    fetchNotifications();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal per creare dipendente */}
      {showCreateEmployee && (
        <CreateEmployeeForm
          onClose={() => setShowCreateEmployee(false)}
          onEmployeeCreated={handleEmployeeCreated}
        />
      )}

      {/* Modal per modificare dipendente */}
      {employeeToEdit && (
        <EditEmployeeForm
          employee={employeeToEdit}
          onClose={() => setEmployeeToEdit(null)}
          onEmployeeUpdated={handleEmployeeUpdated}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
