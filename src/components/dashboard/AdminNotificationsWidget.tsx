import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Inbox, Send, MessageSquare } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeDate, getNotificationTypeLabel } from '@/utils/notificationUtils';

const AdminNotificationsWidget = () => {
  const { notifications, loading } = useNotifications();

  // Filtra le notifiche per tipo
  const systemNotifications = notifications.filter(n => n.type === 'system');
  const messageNotifications = notifications.filter(n => n.type === 'message');
  
  // Prendi solo le prime 3 per ogni sezione
  const recentSystem = systemNotifications.slice(0, 3);
  const recentMessages = messageNotifications.slice(0, 3);

  const EmptyState = ({ icon: Icon, title, description }: { 
    icon: React.ComponentType<{ className?: string }>, 
    title: string, 
    description: string 
  }) => (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-xs text-gray-500 max-w-xs">{description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-blue-600" />
              Messaggi in arrivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-green-600" />
              Spediti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Messaggi in arrivo */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-blue-600" />
            Messaggi in arrivo
            {systemNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {systemNotifications.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentSystem.length === 0 ? (
            <EmptyState 
              icon={MessageSquare}
              title="Nessuna notifica"
              description="Le notifiche del sistema appariranno qui"
            />
          ) : (
            <>
              {recentSystem.map((notification) => (
                <div key={notification.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {getNotificationTypeLabel(notification.type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatRelativeDate(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))}
              {systemNotifications.length > 3 && (
                <Button variant="outline" size="sm" className="w-full">
                  Vedi tutte ({systemNotifications.length})
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Spediti */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-green-600" />
            Spediti
            {messageNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {messageNotifications.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentMessages.length === 0 ? (
            <EmptyState 
              icon={Inbox}
              title="Nessuna notifica"
              description="Le notifiche spedite appariranno qui"
            />
          ) : (
            <>
              {recentMessages.map((notification) => (
                <div key={notification.id} className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {getNotificationTypeLabel(notification.type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatRelativeDate(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                  </div>
                </div>
              ))}
              {messageNotifications.length > 3 && (
                <Button variant="outline" size="sm" className="w-full">
                  Vedi tutte ({messageNotifications.length})
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificationsWidget;
