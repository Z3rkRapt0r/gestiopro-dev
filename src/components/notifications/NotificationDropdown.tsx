
import { useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface NotificationDropdownProps {
  className?: string;
}

const NotificationDropdown = ({ className }: NotificationDropdownProps) => {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  // Calcola notifiche non lette
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const unreadCount = unreadNotifications.length;

  // Mostra solo le ultime 5 notifiche nel dropdown
  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document':
        return '📄';
      case 'leave_request':
        return '🏖️';
      case 'permission_request':
        return '📅';
      case 'sick_leave':
        return '🏥';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`relative h-10 w-10 rounded-xl ${className}`}
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifiche</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs h-auto p-1"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Segna tutte come lette
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Caricamento notifiche...
            </div>
          ) : recentNotifications.length > 0 ? (
            <div className="py-2">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                >
                  <div className="flex-shrink-0 mr-3 text-lg">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(notification.created_at), 'dd MMM, HH:mm', { locale: it })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              Nessuna notifica
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 5 && (
          <div className="p-3 border-t">
            <Button variant="outline" size="sm" className="w-full text-xs">
              Vedi tutte le notifiche
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
