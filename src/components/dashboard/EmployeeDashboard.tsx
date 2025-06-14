
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Bell, 
  LogOut, 
  Euro,
  Calendar,
  Mail,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { useNotifications } from "@/hooks/useNotifications";
import DocumentUpload from "@/components/documents/DocumentUpload";

const EmployeeDashboard = () => {
  const [activeSection, setActiveSection] = useState('documents');
  const { profile, signOut } = useAuth();
  const { documents, downloadDocument, loading: documentsLoading } = useDocuments();
  const { notifications, markAsRead, markAllAsRead, loading: notificationsLoading } = useNotifications();

  const myDocuments = documents.filter(doc => doc.user_id === profile?.id);
  const unreadNotifications = notifications.filter(n => !n.is_read && n.user_id === profile?.id);
  const myNotifications = notifications.filter(n => n.user_id === profile?.id);

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'payslip': 'Busta Paga',
      'transfer': 'Bonifico',
      'communication': 'Comunicazione',
      'medical_certificate': 'Certificato Medico',
      'leave_request': 'Richiesta Ferie',
      'expense_report': 'Nota Spese',
      'contract': 'Contratto',
      'other': 'Altro'
    };
    return types[type] || type;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1048576) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">I Miei Documenti</h2>
        <DocumentUpload onSuccess={() => {}} />
      </div>

      {/* Cards riassuntive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Buste Paga</p>
                <p className="text-2xl font-bold text-gray-900">
                  {myDocuments.filter(d => d.document_type === 'payslip').length}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">{myDocuments.length}</p>
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
          {documentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Caricamento documenti...</p>
            </div>
          ) : myDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun documento</h3>
              <p className="mt-1 text-sm text-gray-500">Carica il tuo primo documento per iniziare</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-2 rounded">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(doc.created_at)} • {formatFileSize(doc.file_size)}
                      </p>
                      {doc.description && (
                        <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{getDocumentTypeLabel(doc.document_type)}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => downloadDocument(doc)}>
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
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notifiche</h2>
        {unreadNotifications.length > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            Segna tutte come lette
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {notificationsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Caricamento notifiche...</p>
            </div>
          ) : myNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna notifica</h3>
              <p className="mt-1 text-sm text-gray-500">Le tue notifiche appariranno qui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border cursor-pointer ${
                    notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(notification.created_at)}</p>
                    </div>
                    <Bell className={`h-5 w-5 ${notification.is_read ? 'text-gray-400' : 'text-blue-600'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <h3 className="text-lg font-medium text-gray-900">
                {profile?.first_name} {profile?.last_name}
              </h3>
              <p className="text-gray-600">{profile?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ruolo</label>
              <p className="mt-1 text-sm text-gray-900">Dipendente</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dipartimento</label>
              <p className="mt-1 text-sm text-gray-900">{profile?.department || 'Non specificato'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Assunzione</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile?.hire_date ? formatDate(profile.hire_date) : 'Non specificata'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Codice Dipendente</label>
              <p className="mt-1 text-sm text-gray-900">{profile?.employee_code || 'Non assegnato'}</p>
            </div>
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
              {unreadNotifications.length > 0 && (
                <Badge className="ml-auto bg-red-500 text-white">
                  {unreadNotifications.length}
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
