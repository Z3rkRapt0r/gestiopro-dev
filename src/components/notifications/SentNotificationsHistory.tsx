
import { useMemo, useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getNotificationTypeLabel, formatRelativeDate } from "@/utils/notificationUtils";
import { Button } from "@/components/ui/button";
import { RotateCcw, Send } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const SentNotificationsHistory = ({ refreshKey }: { refreshKey?: number }) => {
  const { notifications, loading, refreshNotifications } = useNotifications();
  const { profile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Forza il refresh ogni volta che cambia refreshKey
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      console.log("SentNotificationsHistory: refreshKey changed to", refreshKey);
      const forceRefresh = async () => {
        setIsRefreshing(true);
        await refreshNotifications();
        setIsRefreshing(false);
      };
      forceRefresh();
    }
  }, [refreshKey]);

  // Refresh iniziale al mount
  useEffect(() => {
    refreshNotifications();
  }, []);

  // Filtra solo le notifiche inviate dall'admin corrente
  const sentNotifications = useMemo(() => {
    console.log("SentNotificationsHistory: filtering notifications", {
      totalNotifications: notifications.length,
      adminId: profile?.id,
      refreshKey
    });
    
    const filtered = notifications
      .filter(n => n.created_by === profile?.id)
      .slice(0, 10); // Mostra solo le ultime 10
    
    console.log("SentNotificationsHistory: filtered notifications", filtered.length);
    return filtered;
  }, [notifications, profile?.id, refreshKey]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    setIsRefreshing(false);
    toast({ title: "Cronologia aggiornata" });
  };

  if (loading && sentNotifications.length === 0) {
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
        {sentNotifications.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Send className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nessuna notifica inviata</p>
            <p className="text-sm">Le notifiche che invii appariranno qui</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sentNotifications.map((notification) => (
              <div
                key={notification.id}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <Badge 
                    variant="secondary" 
                    className="text-xs ml-2 shrink-0"
                  >
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
                      variant={notification.is_read ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {notification.is_read ? "Letta" : "Non letta"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SentNotificationsHistory;
