
import { useMemo, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNotificationTypeLabel, formatRelativeDate } from "@/utils/notificationUtils";
import { Button } from "@/components/ui/button";
import { RotateCcw, Send, Building2, AlertTriangle, Calendar, Shield, Settings } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SentNotification {
  id: string;
  admin_id: string;
  recipient_id: string | null;
  title: string;
  message: string;
  body?: string;
  type: string;
  attachment_url?: string;
  created_at: string;
}

const SentNotificationsHistory = ({ refreshKey }: { refreshKey?: number }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  const fetchSentNotifications = async () => {
    if (!profile?.id) return;
    
    console.log("SentNotificationsHistory: fetching sent notifications for admin", profile.id);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('sent_notifications')
        .select('*')
        .eq('admin_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching sent notifications:', error);
        return;
      }

      console.log("SentNotificationsHistory: fetched sent notifications", data?.length || 0);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error in fetchSentNotifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Raggruppa le notifiche per tipo
  const notificationsByType = useMemo(() => {
    const grouped = notifications.reduce((acc, notification) => {
      const type = notification.type || 'system';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(notification);
      return acc;
    }, {} as Record<string, SentNotification[]>);

    return grouped;
  }, [notifications]);

  // Calcola i conteggi per ogni tipo
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(notificationsByType).forEach(type => {
      counts[type] = notificationsByType[type].length;
    });
    return counts;
  }, [notificationsByType]);

  // Filtra le notifiche in base al tab attivo
  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") {
      return notifications;
    }
    return notificationsByType[activeTab] || [];
  }, [activeTab, notifications, notificationsByType]);

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

  useEffect(() => {
    fetchSentNotifications();
  }, [profile?.id]);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      console.log("SentNotificationsHistory: refreshKey changed to", refreshKey, "- forcing refresh");
      const forceRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchSentNotifications();
        setIsRefreshing(false);
      };
      forceRefresh();
    }
  }, [refreshKey]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSentNotifications();
    setIsRefreshing(false);
    toast({ title: "Cronologia aggiornata" });
  };

  if (loading && notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Cronologia Notifiche Inviate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            Caricamento cronologia...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Cronologia Notifiche Inviate
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Send className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nessuna notifica inviata</p>
            <p className="text-sm">Le notifiche che invii appariranno qui</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all" className="flex items-center gap-1 text-xs">
                <Send className="w-3 h-3" />
                Tutte ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="Aggiornamenti aziendali" className="flex items-center gap-1 text-xs">
                <Building2 className="w-3 h-3" />
                Aziendali ({typeCounts['Aggiornamenti aziendali'] || 0})
              </TabsTrigger>
              <TabsTrigger value="Comunicazioni importanti" className="flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3 h-3" />
                Importanti ({typeCounts['Comunicazioni importanti'] || 0})
              </TabsTrigger>
              <TabsTrigger value="Eventi" className="flex items-center gap-1 text-xs">
                <Calendar className="w-3 h-3" />
                Eventi ({typeCounts.Eventi || 0})
              </TabsTrigger>
              <TabsTrigger value="Avvisi sicurezza" className="flex items-center gap-1 text-xs">
                <Shield className="w-3 h-3" />
                Sicurezza ({typeCounts['Avvisi sicurezza'] || 0})
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-1 text-xs">
                <Settings className="w-3 h-3" />
                Sistema ({typeCounts.system || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <Badge 
                        variant="secondary" 
                        className="text-xs ml-2 shrink-0 flex items-center gap-1"
                      >
                        {getTypeIcon(notification.type)}
                        {getNotificationTypeLabel(notification.type)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatRelativeDate(notification.created_at)}</span>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className="text-xs"
                        >
                          {notification.recipient_id ? "Singolo" : "Tutti"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {Object.keys(notificationsByType).map((type) => (
              <TabsContent key={type} value={type} className="mt-4">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    {getTypeIcon(type)}
                    <p className="mt-2">Nessuna notifica di tipo "{getNotificationTypeLabel(type)}"</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <Badge 
                            variant="secondary" 
                            className="text-xs ml-2 shrink-0 flex items-center gap-1"
                          >
                            {getTypeIcon(notification.type)}
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatRelativeDate(notification.created_at)}</span>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline"
                              className="text-xs"
                            >
                              {notification.recipient_id ? "Singolo" : "Tutti"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default SentNotificationsHistory;
