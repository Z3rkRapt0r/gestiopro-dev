
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import NotificationsList from "@/components/notifications/NotificationsList";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "@/components/ui/use-toast";
import { RotateCcw } from "lucide-react";

const NotificationsSection = () => {
  const { profile } = useAuth();
  const { notifications, loading, markAsRead, refreshNotifications } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") {
      return !notification.is_read;
    }
    return true; // "all"
  });

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

  return (
    <div>
      <div className="flex gap-2 justify-between mb-2 items-center">
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>
            Tutte ({notifications.length})
          </Button>
          <Button variant={filter === "unread" ? "default" : "ghost"} onClick={() => setFilter("unread")}>
            Non lette ({notifications.filter(n => !n.is_read).length})
          </Button>
        </div>
        <Button size="icon" variant="outline" onClick={onRefresh} title="Aggiorna notifiche" disabled={loading}>
          <RotateCcw className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
      {loading ? (
        <div className="text-center py-4 text-gray-500">Caricamento...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-gray-400 py-8 text-center">
          {filter === "unread" ? "Nessuna notifica non letta." : "Nessuna notifica trovata."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 ${
                notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
              } hover:shadow-sm transition-all cursor-pointer`}
              onClick={() => handleMarkRead(notification.id, notification.is_read)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">{notification.title}</h3>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                  {notification.body && (
                    <div className="text-xs text-gray-500 border-l-2 border-blue-400 pl-3 mt-2 whitespace-pre-line">
                      {notification.body}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(notification.created_at).toLocaleString('it-IT')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;
