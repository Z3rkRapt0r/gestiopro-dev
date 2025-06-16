
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Bell, Calendar, MessageSquare } from "lucide-react";
import { formatRelativeDate } from "@/utils/notificationUtils";
import { getDocumentTypeLabel } from "@/utils/documentUtils";

interface EmployeeActivityFeedProps {
  recentDocuments: any[];
  recentNotifications: any[];
}

const EmployeeActivityFeed = ({ recentDocuments, recentNotifications }: EmployeeActivityFeedProps) => {
  // Combino documenti e notifiche per creare un feed unificato
  const activities = [
    ...recentDocuments.map(doc => ({
      id: `doc-${doc.id}`,
      type: 'document',
      title: doc.title,
      description: getDocumentTypeLabel(doc.document_type),
      time: doc.created_at,
      icon: FileText,
      iconColor: 'text-blue-600',
    })),
    ...recentNotifications.map(notif => ({
      id: `notif-${notif.id}`,
      type: 'notification',
      title: notif.title,
      description: notif.type,
      time: notif.created_at,
      icon: Bell,
      iconColor: notif.is_read ? 'text-gray-400' : 'text-red-600',
      isRead: notif.is_read,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Bacheca Riepilogativa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nessuna attività recente</p>
          ) : (
            activities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`flex-shrink-0 mt-1 ${activity.iconColor}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <div className="flex items-center space-x-2">
                        {activity.type === 'notification' && !activity.isRead && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {activity.type === 'document' ? 'Documento' : 'Notifica'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeDate(activity.time)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeActivityFeed;
