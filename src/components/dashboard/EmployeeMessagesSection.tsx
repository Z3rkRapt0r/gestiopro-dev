
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Search,
  Filter,
  CheckCircle,
  Building2, 
  AlertTriangle, 
  Calendar, 
  Shield, 
  Settings,
  Send
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { formatRelativeDate, groupNotificationsByDate, getNotificationTypeLabel } from "@/utils/notificationUtils";
import SendMessageToAdminDialog from "@/components/messages/SendMessageToAdminDialog";
import EmployeeSentMessages from "@/components/messages/EmployeeSentMessages";

const EmployeeMessagesSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>("all");
  const { profile } = useAuth();
  const { notifications, markAsRead, markAllAsRead, loading } = useNotifications();

  // Ensure notifications is always an array
  const safeNotifications = notifications || [];

  // Messaggi per l'utente loggato (include messaggi manuali e comunicazioni admin)
  const myMessages = safeNotifications.filter(
    (n) => n.user_id === profile?.id && (n.type === "message" || n.type === "system" || n.type === "announcement")
  );
  const unreadMessages = myMessages.filter((n) => !n.is_read);

  // Raggruppa i messaggi per categoria utilizzando il campo category dal database
  const messagesByCategory = useMemo(() => {
    const grouped = myMessages.reduce((acc, msg) => {
      // Use the category field from database, fallback to system
      let category = msg.category || "system";
      
      // Handle legacy messages without category using simple heuristics for backward compatibility
      if (!msg.category && category === "system") {
        if (msg.title.toLowerCase().includes('aziendal') || msg.message.toLowerCase().includes('aziendal')) {
          category = 'Aggiornamenti aziendali';
        } else if (msg.title.toLowerCase().includes('important') || msg.message.toLowerCase().includes('important') || 
                   msg.title.toLowerCase().includes('comunicazione')) {
          category = 'Comunicazioni importanti';
        } else if (msg.title.toLowerCase().includes('evento') || msg.message.toLowerCase().includes('evento')) {
          category = 'Eventi';
        } else if (msg.title.toLowerCase().includes('sicurezza') || msg.message.toLowerCase().includes('sicurezza')) {
          category = 'Avvisi sicurezza';
        }
      }
      
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(msg);
      return acc;
    }, {} as Record<string, typeof myMessages>);

    return grouped;
  }, [myMessages]);

  // Calcola i conteggi per ogni categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(messagesByCategory).forEach(category => {
      counts[category] = messagesByCategory[category].length;
    });
    return counts;
  }, [messagesByCategory]);

  // Filtra i messaggi in base al tab attivo
  const filteredMessages = useMemo(() => {
    let baseMessages = activeTab === "all" ? myMessages : (messagesByCategory[activeTab] || []);
    
    return baseMessages
      .filter((msg) => {
        const matchesSearch =
          msg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRead =
          filterRead === 'all' ||
          (filterRead === 'read' && msg.is_read) ||
          (filterRead === 'unread' && !msg.is_read);
        return matchesSearch && matchesRead;
      })
      .sort((a, b) => {
        if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [activeTab, myMessages, messagesByCategory, searchTerm, filterRead]);

  const groupedMessages = groupNotificationsByDate(filteredMessages);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Aggiornamenti aziendali':
        return <Building2 className="w-4 h-4" />;
      case 'Comunicazioni importanti':
        return <AlertTriangle className="w-4 h-4" />;
      case 'Eventi':
        return <Calendar className="w-4 h-4" />;
      case 'Avvisi sicurezza':
        return <Shield className="w-4 h-4" />;
      case 'system':
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const handleMarkAsRead = async (msgId: string, isRead: boolean) => {
    if (!isRead) await markAsRead(msgId);
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-green-600" />
          Centro Messaggi
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <SendMessageToAdminDialog />
          {unreadMessages.length > 0 && (
            <Button variant="outline" onClick={markAllAsRead} className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base">
              <CheckCircle className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Segna tutti come letti</span>
              <span className="sm:hidden">Segna letti</span> ({unreadMessages.length})
            </Button>
          )}
        </div>
      </div>
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
                  placeholder="Cerca messaggi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-[44px] text-sm sm:text-base"
                />
              </div>
            </div>
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="w-full sm:w-48 border rounded p-2 min-h-[44px] text-sm sm:text-base"
            >
              <option value="all">Tutti</option>
              <option value="unread">Non letti</option>
              <option value="read">Letti</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto mb-4">
              <TabsList className="inline-flex w-max min-w-full gap-1 p-1 h-auto bg-muted rounded-lg">
                <TabsTrigger value="all" className="flex items-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[44px] whitespace-nowrap">
                  <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Tutti</span> ({myMessages.length})
                </TabsTrigger>
                <TabsTrigger value="Aggiornamenti aziendali" className="flex items-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[44px] whitespace-nowrap">
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Aziendali</span><span className="sm:hidden">Azien.</span> ({categoryCounts['Aggiornamenti aziendali'] || 0})
                </TabsTrigger>
                <TabsTrigger value="Comunicazioni importanti" className="flex items-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[44px] whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Importanti</span><span className="sm:hidden">Import.</span> ({categoryCounts['Comunicazioni importanti'] || 0})
                </TabsTrigger>
                <TabsTrigger value="Eventi" className="flex items-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[44px] whitespace-nowrap">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  Eventi ({categoryCounts.Eventi || 0})
                </TabsTrigger>
                <TabsTrigger value="Avvisi sicurezza" className="flex items-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[44px] whitespace-nowrap">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Sicurezza</span><span className="sm:hidden">Sicur.</span> ({categoryCounts['Avvisi sicurezza'] || 0})
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[44px] whitespace-nowrap">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                  Sistema ({categoryCounts.system || 0})
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex items-center gap-1 text-xs sm:text-sm px-3 py-2 min-h-[44px] whitespace-nowrap">
                  <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Inviati</span><span className="sm:hidden">Inv.</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-4">
              <MessagesList 
                groupedMessages={groupedMessages} 
                loading={loading} 
                filteredMessages={filteredMessages}
                searchTerm={searchTerm}
                filterRead={filterRead}
                onMarkAsRead={handleMarkAsRead}
                getTypeIcon={getTypeIcon}
              />
            </TabsContent>

            {Object.keys(messagesByCategory).map((category) => (
              <TabsContent key={category} value={category} className="mt-4">
                <MessagesList 
                  groupedMessages={groupedMessages} 
                  loading={loading} 
                  filteredMessages={filteredMessages}
                  searchTerm={searchTerm}
                  filterRead={filterRead}
                  onMarkAsRead={handleMarkAsRead}
                  getTypeIcon={getTypeIcon}
                />
              </TabsContent>
            ))}

            <TabsContent value="sent" className="mt-4">
              <EmployeeSentMessages />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeMessagesSection;

// Componente per la lista dei messaggi
interface MessagesListProps {
  groupedMessages: any;
  loading: boolean;
  filteredMessages: any[];
  searchTerm: string;
  filterRead: string;
  onMarkAsRead: (id: string, isRead: boolean) => void;
  getTypeIcon: (type: string) => JSX.Element;
}

function MessagesList({ 
  groupedMessages, 
  loading, 
  filteredMessages, 
  searchTerm, 
  filterRead, 
  onMarkAsRead,
  getTypeIcon
}: MessagesListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Caricamento messaggi...</p>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nessun messaggio trovato
          </h3>
          <p className="mt-2 text-gray-500">
            {searchTerm || filterRead !== 'all'
              ? 'Prova a cambiare i filtri o la ricerca'
              : 'I messaggi appariranno qui'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedMessages.today.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Oggi</h3>
          <div className="space-y-3">
            {groupedMessages.today.map((msg: any) => (
              <MessageCard
                key={msg.id}
                message={msg}
                onMarkAsRead={onMarkAsRead}
                getTypeIcon={getTypeIcon}
              />
            ))}
          </div>
        </div>
      )}
      {groupedMessages.yesterday.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Ieri</h3>
          <div className="space-y-3">
            {groupedMessages.yesterday.map((msg: any) => (
              <MessageCard
                key={msg.id}
                message={msg}
                onMarkAsRead={onMarkAsRead}
                getTypeIcon={getTypeIcon}
              />
            ))}
          </div>
        </div>
      )}
      {groupedMessages.older.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Precedenti</h3>
          <div className="space-y-3">
            {groupedMessages.older.map((msg: any) => (
              <MessageCard
                key={msg.id}
                message={msg}
                onMarkAsRead={onMarkAsRead}
                getTypeIcon={getTypeIcon}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Scheda messaggio
interface MessageCardProps {
  message: any;
  onMarkAsRead: (id: string, isRead: boolean) => void;
  getTypeIcon: (type: string) => JSX.Element;
}

function MessageCard({ message, onMarkAsRead, getTypeIcon }: MessageCardProps) {
  // Use the category field from database, fallback to system with legacy heuristics
  let category = message.category || "system";
  
  // Handle legacy messages without category using simple heuristics for backward compatibility
  if (!message.category && category === "system") {
    if (message.title.toLowerCase().includes('aziendal') || message.message.toLowerCase().includes('aziendal')) {
      category = 'Aggiornamenti aziendali';
    } else if (message.title.toLowerCase().includes('important') || message.message.toLowerCase().includes('important') || 
               message.title.toLowerCase().includes('comunicazione')) {
      category = 'Comunicazioni importanti';
    } else if (message.title.toLowerCase().includes('evento') || message.message.toLowerCase().includes('evento')) {
      category = 'Eventi';
    } else if (message.title.toLowerCase().includes('sicurezza') || message.message.toLowerCase().includes('sicurezza')) {
      category = 'Avvisi sicurezza';
    }
  }

  return (
    <Card
      className={`flex w-full items-start gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer border min-h-[44px]
        ${!message.is_read ? 'border-green-500 bg-green-50' : ''}
        hover:shadow-md transition-shadow`}
      onClick={() => onMarkAsRead(message.id, message.is_read)}
    >
      <div className="flex-shrink-0 mt-1">
        <div className={`h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center ${!message.is_read ? 'text-green-600' : 'text-gray-400'}`}>
          {getTypeIcon(category)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{message.title}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {!message.is_read && (
              <Badge variant="outline" className="text-xs text-green-800 border-green-600 whitespace-nowrap">Non letto</Badge>
            )}
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {getNotificationTypeLabel(category)}
            </Badge>
          </div>
        </div>
        <div className="text-gray-700 text-sm sm:text-base mt-1 line-clamp-2">{message.message}</div>
        <div className="mt-1 text-xs sm:text-sm text-gray-500">{formatRelativeDate(message.created_at)}</div>
      </div>
    </Card>
  );
}
