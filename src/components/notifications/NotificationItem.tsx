
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Circle, 
  FileText, 
  MessageSquare, 
  Megaphone, 
  Settings,
  Trash2,
  Download
} from 'lucide-react';
import { formatRelativeDate, getNotificationTypeLabel } from '@/utils/notificationUtils';
import { supabase } from '@/integrations/supabase/client';

interface NotificationItemProps {
  notification: any;
  onMarkAsRead: (id: string, isRead: boolean) => void;
  onDelete?: (id: string) => void;
}

const NotificationItem = ({ notification, onMarkAsRead, onDelete }: NotificationItemProps) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-purple-600" />;
      case 'system':
      default:
        return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAttachmentUrl = (path: string) => {
    return supabase.storage.from("notification-attachments").getPublicUrl(path).data.publicUrl;
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-sm ${
        notification.is_read 
          ? 'bg-gray-50 border-gray-200' 
          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      }`}
      onClick={() => onMarkAsRead(notification.id, notification.is_read)}
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
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {notification.message}
            </p>
            {notification.body && (
              <div className="text-xs text-gray-500 border-l-2 border-blue-400 pl-3 mt-2 whitespace-pre-line">
                {notification.body}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-xs text-gray-400">
                  {formatRelativeDate(notification.created_at)}
                </p>
                <Badge variant="outline" className="text-xs">
                  {getNotificationTypeLabel(notification.type)}
                </Badge>
              </div>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2 mt-1">
          {notification.is_read ? (
            <CheckCircle className="h-5 w-5 text-gray-400" />
          ) : (
            <Circle className="h-5 w-5 text-blue-600" />
          )}
        </div>
      </div>
    </Card>
  );
};

export default NotificationItem;
