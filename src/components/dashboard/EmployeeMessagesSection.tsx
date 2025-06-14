
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Search,
  Filter,
  CheckCircle
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { formatRelativeDate, groupNotificationsByDate } from "@/utils/notificationUtils";

const EmployeeMessagesSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRead, setFilterRead] = useState<string>('all');
  const { profile } = useAuth();
  const { notifications, markAsRead, markAllAsRead, loading } = useNotifications();

  // Solo messaggi per l'utente loggato
  const myMessages = notifications.filter(
    (n) => n.user_id === profile?.id && n.type === "message"
  );
  const unreadMessages = myMessages.filter((n) => !n.is_read);

  // Filtro ricerca e stato lettura
  const filteredMessages = myMessages
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

  const groupedMessages = groupNotificationsByDate(filteredMessages);

  const handleMarkAsRead = async (msgId: string, isRead: boolean) => {
    if (!isRead) await markAsRead(msgId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-green-600" />
          Centro Messaggi
        </h2>
        {unreadMessages.length > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Segna tutti come letti ({unreadMessages.length})
          </Button>
        )}
      </div>
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
                  placeholder="Cerca messaggi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="w-full sm:w-48 border rounded p-2"
            >
              <option value="all">Tutti</option>
              <option value="unread">Non letti</option>
              <option value="read">Letti</option>
            </select>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento messaggi...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
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
        ) : (
          <>
            {groupedMessages.today.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Oggi</h3>
                <div className="space-y-3">
                  {groupedMessages.today.map((msg) => (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              </div>
            )}
            {groupedMessages.yesterday.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Ieri</h3>
                <div className="space-y-3">
                  {groupedMessages.yesterday.map((msg) => (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              </div>
            )}
            {groupedMessages.older.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Precedenti</h3>
                <div className="space-y-3">
                  {groupedMessages.older.map((msg) => (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeMessagesSection;

// Scheda messaggio
interface MessageCardProps {
  message: any;
  onMarkAsRead: (id: string, isRead: boolean) => void;
}
function MessageCard({ message, onMarkAsRead }: MessageCardProps) {
  return (
    <Card
      className={`flex w-full items-start gap-4 p-4 cursor-pointer border
        ${!message.is_read ? 'border-green-500 bg-green-50' : ''}
        hover:shadow-md transition-shadow`}
      onClick={() => onMarkAsRead(message.id, message.is_read)}
    >
      <div className="flex-shrink-0 mt-1">
        <MessageSquare className={`h-7 w-7 ${!message.is_read ? 'text-green-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{message.title}</span>
          {!message.is_read && (
            <Badge variant="outline" className="ml-2 text-green-800 border-green-600">Non letto</Badge>
          )}
        </div>
        <div className="text-gray-700">{message.message}</div>
        <div className="mt-1 text-sm text-gray-500">{formatRelativeDate(message.created_at)}</div>
      </div>
    </Card>
  );
}
