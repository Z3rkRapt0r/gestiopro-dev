
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Upload, 
  Bell, 
  LogOut, 
  Euro,
  Calendar,
  Mail,
  User
} from "lucide-react";

interface EmployeeDashboardProps {
  user: { role: 'admin' | 'employee'; name: string; email: string };
  onLogout: () => void;
}

const EmployeeDashboard = ({ user, onLogout }: EmployeeDashboardProps) => {
  const [activeSection, setActiveSection] = useState('documents');

  const personalDocuments = [
    { id: 1, name: 'Busta Paga - Maggio 2024', type: 'Busta Paga', date: '2024-06-01', size: '245 KB' },
    { id: 2, name: 'Busta Paga - Aprile 2024', type: 'Busta Paga', date: '2024-05-01', size: '242 KB' },
    { id: 3, name: 'Bonifico Rimborso Spese', type: 'Bonifico', date: '2024-05-15', size: '156 KB' },
    { id: 4, name: 'Comunicazione Ferie Estive', type: 'Comunicazione', date: '2024-05-10', size: '89 KB' },
    { id: 5, name: 'Contratto di Lavoro', type: 'Contratto', date: '2024-01-15', size: '1.2 MB' },
  ];

  const notifications = [
    { id: 1, title: 'Nuova Busta Paga Disponibile', message: 'È disponibile la busta paga di Maggio 2024', date: '2024-06-01', read: false },
    { id: 2, title: 'Comunicazione Aziendale', message: 'Aggiornamento procedure di sicurezza', date: '2024-05-28', read: true },
    { id: 3, title: 'Rimborso Spese Elaborato', message: 'Il rimborso spese è stato accreditato', date: '2024-05-25', read: true },
  ];

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">I Miei Documenti</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Carica Documento
        </Button>
      </div>

      {/* Cards riassuntive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Buste Paga</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documenti Totali</p>
                <p className="text-2xl font-bold text-gray-900">28</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ultimo Accesso</p>
                <p className="text-2xl font-bold text-gray-900">Oggi</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista documenti */}
      <Card>
        <CardHeader>
          <CardTitle>Documenti Personali</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {personalDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.name}</h3>
                    <p className="text-sm text-gray-600">{doc.date} • {doc.size}</p>
                  </div>
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

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notifiche</h2>
        <Button variant="outline">
          Segna tutte come lette
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className={`p-4 rounded-lg border ${notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{notification.title}</h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{notification.date}</p>
                  </div>
                  <Bell className={`h-5 w-5 ${notification.read ? 'text-gray-400' : 'text-blue-600'}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profilo Personale</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Personali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ruolo</label>
              <p className="mt-1 text-sm text-gray-900">Dipendente</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dipartimento</label>
              <p className="mt-1 text-sm text-gray-900">Produzione</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Assunzione</label>
              <p className="mt-1 text-sm text-gray-900">15 Gennaio 2024</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Codice Dipendente</label>
              <p className="mt-1 text-sm text-gray-900">EMP001</p>
            </div>
          </div>
          
          <div className="pt-4">
            <Button variant="outline">
              Modifica Profilo
            </Button>
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
              <div className="bg-green-600 p-2 rounded">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Area Personale</h1>
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
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge className="ml-auto bg-red-500 text-white">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </Button>
            
            <Button
              variant={activeSection === 'profile' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('profile')}
            >
              <User className="mr-2 h-4 w-4" />
              Profilo
            </Button>
            
            <Button
              variant={activeSection === 'messages' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('messages')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Messaggi
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === 'documents' && renderDocuments()}
            {activeSection === 'notifications' && renderNotifications()}
            {activeSection === 'profile' && renderProfile()}
            {activeSection === 'messages' && (
              <div className="text-center py-12">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Centro Messaggi</h3>
                <p className="mt-1 text-sm text-gray-500">Funzionalità in sviluppo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
