
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Bell, 
  Search,
  Filter,
  Plus,
  Users,
  MessageSquare,
  AlertCircle,
  Inbox,
  Mail
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import NotificationItem from "@/components/notifications/NotificationItem";
import NotificationsCleanupButton from "@/components/notifications/NotificationsCleanupButton";
import { groupNotificationsByDate, getNotificationTypeLabel, formatRelativeDate } from "@/utils/notificationUtils";
import { useToast } from "@/hooks/use-toast";
import NotificationForm from '@/components/notifications/NotificationForm';

const AdminNotificationsSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  
  const { profile } = useAuth();
  const { notifications, createNotification, loading, markAsRead, refreshNotifications } = useNotifications();
  const { toast } = useToast();

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      toast({
        title: "Successo",
        description: "Messaggio contrassegnato come letto",
      });
      // Refresh notifications list without reloading page
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
      toast({
        title: "Errore",
        description: "Impossibile contrassegnare come letto",
        variant: "destructive",
      });
    }
  };


  // Ensure notifications is always an array
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  // Filter notifications by tab
  const getNotificationsForTab = (tab: 'inbox' | 'sent') => {
    if (tab === 'inbox') {
      // Messaggi non letti
      return safeNotifications.filter(n => !n.is_read);
    } else {
      // Messaggi letti
      return safeNotifications.filter(n => n.is_read);
    }
  };

  // Filtering logic for current tab
  const tabNotifications = getNotificationsForTab(activeTab);
  const filteredNotifications = tabNotifications
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
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });


  const notificationTypeStats = safeNotifications.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unreadCount = safeNotifications.filter(n => !n.is_read).length;
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  // Count notifications for each tab
  const inboxCount = safeNotifications.filter(n => !n.is_read).length;
  const sentCount = safeNotifications.filter(n => n.is_read).length;


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Gestione Notifiche</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Notifica
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crea Nuova Notifica</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <NotificationForm onCreated={() => {
                setShowCreateDialog(false);
                // Refresh notifications list if needed
              }} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards riassuntive */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Non Lette</p>
                <p className="text-2xl font-bold text-red-600">
                  {unreadCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sistema</p>
                <p className="text-2xl font-bold text-blue-600">
                  {notificationTypeStats.system || 0}
                </p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
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
                <p className="text-2xl font-bold text-gray-900">{safeNotifications.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'inbox'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Inbox className="h-4 w-4" />
          Messaggi in arrivo
          {inboxCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {inboxCount}
            </Badge>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sent'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Mail className="h-4 w-4" />
          Spediti
          {sentCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {sentCount}
            </Badge>
          )}
        </button>
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

      {/* Grouped notifications list */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento notifiche...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              {activeTab === 'inbox' && <Inbox className="mx-auto h-16 w-16 text-gray-400" />}
              {activeTab === 'sent' && <Mail className="mx-auto h-16 w-16 text-gray-400" />}
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {searchTerm || filterType !== 'all' || filterRead !== 'all' 
                  ? 'Nessuna notifica trovata' 
                  : 'Nessuna notifica'
                }
              </h3>
              <p className="mt-2 text-gray-500">
                {searchTerm || filterType !== 'all' || filterRead !== 'all'
                  ? 'Prova a modificare i filtri di ricerca'
                  : activeTab === 'inbox' 
                    ? 'I messaggi in arrivo appariranno qui'
                    : 'I messaggi letti appariranno qui'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {groupedNotifications.today.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Oggi</h3>
                <div className="space-y-3">
                  {groupedNotifications.today.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={() => handleMarkAsRead(notification.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedNotifications.yesterday.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Ieri</h3>
                <div className="space-y-3">
                  {groupedNotifications.yesterday.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={() => handleMarkAsRead(notification.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedNotifications.older.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Precedenti</h3>
                <div className="space-y-3">
                  {groupedNotifications.older.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={() => handleMarkAsRead(notification.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sezione Cleanup Notifiche */}
      <NotificationsCleanupButton />
    </div>
  );
};

export default AdminNotificationsSection;
