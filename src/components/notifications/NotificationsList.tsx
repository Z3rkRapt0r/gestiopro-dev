
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  is_global: boolean;
  subject: string;
  short_text: string;
  body: string | null;
  attachment_url: string | null;
  read_by: string[];
  created_at: string;
}

interface Props {
  notifications: Notification[];
  adminView?: boolean;
  onDelete?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

const getAttachmentUrl = (path: string) =>
  supabase.storage.from("notification-attachments").getPublicUrl(path).data.publicUrl;

const NotificationsList = ({
  notifications,
  adminView,
  onDelete,
  onMarkRead,
}: Props) => {
  const { profile } = useAuth();

  if (notifications.length === 0) {
    return <div className="text-center py-6 text-gray-400">Nessuna notifica.</div>;
  }

  return (
    <div className="space-y-3">
      {notifications.map(n => (
        <div
          key={n.id}
          className={`flex flex-col md:flex-row gap-2 border rounded px-4 py-3 items-center ${n.read_by?.includes(profile?.id || "") ? "bg-gray-50" : "bg-blue-50"}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{n.subject}</span>
              {n.is_global && <Badge className="bg-purple-500">Generale</Badge>}
              {!n.is_global && <Badge className="bg-blue-600">Personale</Badge>}
              {n.attachment_url && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => window.open(getAttachmentUrl(n.attachment_url!), "_blank")}
                  title="Scarica allegato"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="text-sm text-gray-700 mb-1">{n.short_text}</div>
            {n.body && (
              <pre className="border-l-2 border-blue-400 pl-3 text-xs text-gray-500 mt-1 whitespace-pre-line">
                {n.body}
              </pre>
            )}
            <div className="flex gap-2 mt-1 text-xs text-gray-500">
              <span>{new Date(n.created_at).toLocaleString("it-IT")}</span>
              <span>Letta da: <b>{n.read_by?.length ?? 0}</b></span>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-1">
            {!n.read_by?.includes(profile?.id || "") && onMarkRead && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkRead(n.id)}
              >
                Segna come letta
              </Button>
            )}
            {adminView && onDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(n.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Elimina
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationsList;
