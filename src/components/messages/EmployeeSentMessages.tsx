import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Inbox as InboxIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeDate } from "@/utils/notificationUtils";

interface SentMessage {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function EmployeeSentMessages() {
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    fetchSentMessages();
  }, [profile?.id]);

  const fetchSentMessages = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      console.log('Fetching sent messages for employee:', profile.id);
      
      // Fetch messages sent by this employee to admins
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, created_at, is_read')
        .eq('created_by', profile.id)
        .eq('category', 'employee_message')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent messages:', error);
        throw error;
      }

      console.log('Sent messages found:', data?.length || 0);
      setSentMessages(data || []);
    } catch (error) {
      console.error('Error in fetchSentMessages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 text-sm">Caricamento messaggi inviati...</p>
      </div>
    );
  }

  if (sentMessages.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Mail className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nessun messaggio inviato
          </h3>
          <p className="mt-2 text-gray-500">
            I messaggi che invii all'amministratore appariranno qui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Messaggi Inviati ({sentMessages.length})
      </h3>
      {sentMessages.map((msg) => (
        <Card key={msg.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{msg.title}</h4>
                  {msg.is_read ? (
                    <Badge variant="secondary" className="text-xs">
                      Letto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-blue-600 text-blue-600">
                      Inviato
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-2">{msg.message}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <InboxIcon className="h-3 w-3" />
                  <span>All'amministratore</span>
                  <span>•</span>
                  <span>{formatRelativeDate(msg.created_at)}</span>
                </div>
              </div>
              <Mail className={`h-5 w-5 ml-4 ${msg.is_read ? 'text-gray-400' : 'text-blue-600'}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

