
import { useMemo, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getNotificationTypeLabel, formatRelativeDate } from "@/utils/notificationUtils";
import { Button } from "@/components/ui/button";
import { RotateCcw, Send } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SentNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_by: string | null;
  created_at: string;
  body?: string;
  attachment_url?: string;
}

const SentNotificationsHistory = ({ refreshKey }: { refreshKey?: number }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSentNotifications = async () => {
    if (!profile?.id) return;
    
    console.log("SentNotificationsHistory: fetching notifications for admin", profile.id);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching sent notifications:', error);
        return;
      }

      console.log("SentNotificationsHistory: fetched notifications", data?.length || 0);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error in fetchSentNotifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh iniziale al mount
  useEffect(() => {
    fetchSentNotifications();
  }, [profile?.id]);

  // Forza il refresh ogni volta che cambia refreshKey
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      console.log("SentNotificationsHistory: refreshKey changed to", refreshKey, "- forcing refresh");
      const forceRefresh = async () => {
        setIsRefreshing(true);
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
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
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
