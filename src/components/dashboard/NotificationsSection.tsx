
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "@/components/ui/use-toast";
import { 
  RotateCcw, 
  User, 
  Users, 
  AlertCircle,
  CheckCircle,
  Circle,
  FileText,
  MessageSquare,
  Megaphone,
  Settings,
  Download
} from "lucide-react";
import { formatRelativeDate, getNotificationTypeLabel } from "@/utils/notificationUtils";
import { supabase } from "@/integrations/supabase/client";

const NotificationsSection = () => {
  const { profile } = useAuth();
  const { notifications, loading, markAsRead, refreshNotifications } = useNotifications();
  const [activeTab, setActiveTab] = useState<"personal" | "general" | "unread">("unread");

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-purple-600" />;
      case 'system':
      default:
        return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAttachmentUrl = (path: string) => {
    return supabase.storage.from("notification-attachments").getPublicUrl(path).data.publicUrl;
  };

  // Filtro le notifiche in base alla tab attiva
  const filteredNotifications = notifications.filter((notification) => {
    switch (activeTab) {
      case "personal":
        // Notifiche personali (inviate specificamente a questo utente, non generali)
        return notification.created_by !== null && !isGeneralNotification(notification);
      case "general":
        // Notifiche generali (rivolte a tutti i dipendenti)
        return isGeneralNotification(notification);
      case "unread":
        // Notifiche non lette
        return !notification.is_read;
      default:
        return true;
    }
  });

  // Funzione per determinare se una notifica è generale
  const isGeneralNotification = (notification: any) => {
    // Una notifica è generale se il tipo suggerisce che è rivolta a tutti
    // o se contiene indicatori specifici nel titolo/messaggio
    const generalTypes = ['announcement', 'system'];
    const generalKeywords = ['tutti', 'generale', 'comunicazione aziendale', 'avviso generale'];
    
    return generalTypes.includes(notification.type) || 
           generalKeywords.some(keyword => 
             notification.title?.toLowerCase().includes(keyword) || 
             notification.message?.toLowerCase().includes(keyword)
           );
  };

  const personalCount = notifications.filter(n => n.created_by !== null && !isGeneralNotification(n)).length;
  const generalCount = notifications.filter(n => isGeneralNotification(n)).length;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id: string, currentReadStatus: boolean) => {
    if (!currentReadStatus) {
      await markAsRead(id);
      toast({ title: "Notifica segnata come letta" });
    }
  };

  const onRefresh = () => {
    refreshNotifications();
    toast({ title: "Notifiche aggiornate" });
  };

  const renderNotificationCard = (notification: any) => (
    <Card
      key={notification.id}
      className={`p-4 cursor-pointer transition-all hover:shadow-sm ${
        notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      }`}
      onClick={() => handleMarkRead(notification.id, notification.is_read)}
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
              {notification.attachment_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(getAttachmentUrl(notification.attachment_url), "_blank");
                  }}
                  className="h-6 w-6 p-0"
                  title="Scarica allegato"
                >
                  <Download className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {notification.message}
            </p>
            {notification.body && (
              <div className="text-xs text-gray-500 border-l-2 border-blue-400 pl-3 mt-2 whitespace-pre-line">
                {notification.body}
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">
                {formatRelativeDate(notification.created_at)}
              </p>
              <Badge variant="outline" className="text-xs">
                {getNotificationTypeLabel(notification.type)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2 mt-1">
          {notification.is_read ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-blue-600" />
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notifiche</h2>
        <Button 
          size="icon" 
          variant="outline" 
          onClick={onRefresh} 
          title="Aggiorna notifiche" 
          disabled={loading}
        >
          <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "personal" | "general" | "unread")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Non lette ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personali ({personalCount})
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Generali ({generalCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="mt-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Caricamento...</div>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tutte le notifiche sono state lette!</h3>
              <p className="text-gray-500">Non hai notifiche non lette al momento.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(renderNotificationCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Caricamento...</div>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna notifica personale</h3>
              <p className="text-gray-500">Non hai ricevuto notifiche personali.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(renderNotificationCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="general" className="mt-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Caricamento...</div>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna notifica generale</h3>
              <p className="text-gray-500">Non sono presenti notifiche generali.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(renderNotificationCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsSection;
