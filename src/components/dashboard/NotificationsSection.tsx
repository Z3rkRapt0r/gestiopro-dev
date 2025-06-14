
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bell, 
  Search,
  Filter,
  CheckCircle,
  Circle,
  FileText,
  MessageSquare,
  Megaphone,
  Settings
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

const NotificationsSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  
  const { profile } = useAuth();
  const { notifications, markAsRead, markAllAsRead, loading } = useNotifications();

  const myNotifications = notifications.filter(n => n.user_id === profile?.id);
  const unreadNotifications = myNotifications.filter(n => !n.is_read);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-purple-600" />;
      case 'system':
      default:
        return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'document': 'Documento',
      'system': 'Sistema',
      'message': 'Messaggio',
      'announcement': 'Annuncio'
    };
    return types[type] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minuti fa`;
    } else if (diffHours < 24) {
      return `${diffHours} ore fa`;
    } else if (diffDays < 7) {
      return `${diffDays} giorni fa`;
    } else {
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // Filtering logic
  const filteredNotifications = myNotifications
    .filter(notification => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notification.message.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || notification.type === filterType;
      
      const matchesRead = filterRead === 'all' || 
                         (filterRead === 'read' && notification.is_read) ||
                         (filterRead === 'unread' && !notification.is_read);
      
      return matchesSearch && matchesType && matchesRead;
    })
    .sort((a, b) => {
      // Prima le non lette, poi per data
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const notificationTypeStats = myNotifications.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleMarkAsRead = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Notifiche</h2>
        {unreadNotifications.length > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="hover:bg-blue-50">
            <CheckCircle className="mr-2 h-4 w-4" />
            Segna tutte come lette ({unreadNotifications.length})
          </Button>
        )}
      </div>

      {/* Cards riassuntive */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Non Lette</p>
                <p className="text-2xl font-bold text-red-600">
                  {unreadNotifications.length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documenti</p>
                <p className="text-2xl font-bold text-blue-600">
                  {notificationTypeStats.document || 0}
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
                <p className="text-sm font-medium text-gray-600">Messaggi</p>
                <p className="text-2xl font-bold text-green-600">
                  {notificationTypeStats.message || 0}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totali</p>
                <p className="text-2xl font-bold text-gray-900">{myNotifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-purple-600" />
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
                  placeholder="Cerca notifiche..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo notifica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="document">Documenti</SelectItem>
                <SelectItem value="message">Messaggi</SelectItem>
                <SelectItem value="announcement">Annunci</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Stato lettura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="unread">Non lette</SelectItem>
                <SelectItem value="read">Lette</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista notifiche */}
      <Card>
        <CardHeader>
          <CardTitle>
            Le Tue Notifiche
            {filteredNotifications.length !== myNotifications.length && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({filteredNotifications.length} di {myNotifications.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Caricamento notifiche...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {searchTerm || filterType !== 'all' || filterRead !== 'all' 
                  ? 'Nessuna notifica trovata' 
                  : 'Nessuna notifica'
                }
              </h3>
              <p className="mt-2 text-gray-500">
                {searchTerm || filterType !== 'all' || filterRead !== 'all'
                  ? 'Prova a modificare i filtri di ricerca'
                  : 'Le tue notifiche appariranno qui'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                    notification.is_read 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  }`}
                  onClick={() => handleMarkAsRead(notification.id, notification.is_read)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4">
                          <p className="text-xs text-gray-400">
                            {formatDate(notification.created_at)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2 mt-1">
                      {notification.is_read ? (
                        <CheckCircle className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Circle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSection;
