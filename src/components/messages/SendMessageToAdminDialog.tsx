import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SendMessageToAdminDialogProps {
  trigger?: React.ReactNode;
}

export default function SendMessageToAdminDialog({ trigger }: SendMessageToAdminDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci oggetto e messaggio",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Errore",
        description: "Errore di autenticazione",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch all admin users
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (adminsError) {
        console.error('Error fetching admins:', adminsError);
        throw adminsError;
      }

      if (!admins || admins.length === 0) {
        toast({
          title: "Errore",
          description: "Nessun amministratore trovato",
          variant: "destructive",
        });
        return;
      }

      // 2. Create notification for each admin in notifications table
      const notificationsToInsert = admins.map(admin => ({
        user_id: admin.id,
        title: `Messaggio da ${profile.first_name} ${profile.last_name}: ${subject}`,
        message: message,
        type: 'message',
        category: 'employee_message',
        created_by: profile.id,
        is_read: false
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        throw notificationError;
      }

      // 3. Send email notification to admins via Edge Function
      console.log('Sending email notifications to admins...');
      
      for (const admin of admins) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
            body: {
              recipientEmail: admin.email,
              recipientName: `${admin.first_name} ${admin.last_name}`,
              subject: `Nuovo messaggio da ${profile.first_name} ${profile.last_name}`,
              message: message,
              notificationType: 'employee_message',
              senderName: `${profile.first_name} ${profile.last_name}`,
              messageTitle: subject
            }
          });

          if (emailError) {
            console.error(`Error sending email to ${admin.email}:`, emailError);
          } else {
            console.log(`Email sent successfully to ${admin.email}`);
          }
        } catch (emailError) {
          console.error(`Failed to send email to ${admin.email}:`, emailError);
        }
      }

      toast({
        title: "Messaggio inviato!",
        description: "Il tuo messaggio è stato inviato all'amministratore",
      });

      // Reset form and close dialog
      setSubject("");
      setMessage("");
      setOpen(false);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'invio del messaggio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Send className="mr-2 h-4 w-4" />
            Invia Messaggio all'Amministratore
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invia Messaggio all'Amministratore</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium">
              Oggetto <span className="text-red-500">*</span>
            </label>
            <Input
              id="subject"
              placeholder="Oggetto del messaggio"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Messaggio <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="message"
              placeholder="Scrivi il tuo messaggio qui..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={8}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || !subject.trim() || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Invia Messaggio
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

