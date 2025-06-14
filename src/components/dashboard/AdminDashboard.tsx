
import { useState } from "react";
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

interface AdminDashboardProps {
  user: { role: 'admin' | 'employee'; name: string; email: string };
  onLogout: () => void;
}

const AdminDashboard = ({ user, onLogout }: AdminDashboardProps) => {
  const [activeSection, setActiveSection] = useState('dashboard');

  // Dati demo per i grafici
  const documentsData = [
    { name: 'Gen', documents: 45 },
    { name: 'Feb', documents: 52 },
    { name: 'Mar', documents: 48 },
    { name: 'Apr', documents: 61 },
    { name: 'Mag', documents: 55 },
    { name: 'Giu', documents: 67 },
  ];

  const employeeData = [
    { name: 'Attivi', value: 25, color: '#3b82f6' },
    { name: 'In Ferie', value: 3, color: '#10b981' },
    { name: 'Assenti', value: 2, color: '#f59e0b' },
  ];

  const employees = [
    { id: 1, name: 'Giuseppe Verdi', email: 'g.verdi@serramenti.com', role: 'Dipendente', status: 'Attivo' },
    { id: 2, name: 'Marco Bianchi', email: 'm.bianchi@serramenti.com', role: 'Dipendente', status: 'Attivo' },
    { id: 3, name: 'Luca Ferrari', email: 'l.ferrari@serramenti.com', role: 'Dipendente', status: 'In Ferie' },
    { id: 4, name: 'Anna Rossi', email: 'a.rossi@serramenti.com', role: 'Dipendente', status: 'Attivo' },
  ];

  const recentDocuments = [
    { id: 1, name: 'Busta Paga Maggio 2024', employee: 'Giuseppe Verdi', date: '2024-06-01', type: 'Busta Paga' },
    { id: 2, name: 'Certificato Medico', employee: 'Marco Bianchi', date: '2024-05-28', type: 'Documento' },
    { id: 3, name: 'Richiesta Ferie', employee: 'Luca Ferrari', date: '2024-05-25', type: 'Richiesta' },
    { id: 4, name: 'Comunicazione Sicurezza', employee: 'Tutti', date: '2024-05-20', type: 'Comunicazione' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Cards statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dipendenti Totali</p>
                <p className="text-2xl font-bold text-gray-900">30</p>
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
                <p className="text-2xl font-bold text-gray-900">67</p>
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
                <p className="text-2xl font-bold text-gray-900">12</p>
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
                <p className="text-2xl font-bold text-gray-900">98%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Documenti Mensili</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={documentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="documents" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Dipendenti</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={employeeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {employeeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {employeeData.map((entry, index) => (
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

      {/* Documenti recenti */}
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
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestione Dipendenti</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Aggiungi Dipendente
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{employee.name}</h3>
                  <p className="text-sm text-gray-600">{employee.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={employee.status === 'Attivo' ? 'default' : 'secondary'}
                  >
                    {employee.status}
                  </Badge>
                  <Button size="sm" variant="ghost">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

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
              <span className="text-sm text-gray-600">Benvenuto, {user.name}</span>
              <Button variant="ghost" onClick={onLogout}>
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
            {activeSection === 'documents' && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Gestione Documenti</h3>
                <p className="mt-1 text-sm text-gray-500">Funzionalità in sviluppo</p>
              </div>
            )}
            {activeSection === 'notifications' && (
              <div className="text-center py-12">
                <Bell className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Centro Notifiche</h3>
                <p className="mt-1 text-sm text-gray-500">Funzionalità in sviluppo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
