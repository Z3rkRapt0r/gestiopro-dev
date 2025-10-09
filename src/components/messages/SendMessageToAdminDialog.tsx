import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
      // Use Edge Function to send message (bypasses RLS)
      console.log('Sending message via Edge Function...');
      const { data, error } = await supabase.functions.invoke('send-employee-message', {
        body: {
          subject: subject,
          message: message,
          employeeId: profile.id,
          employeeName: `${profile.first_name} ${profile.last_name}`
        }
      });

      console.log('Edge Function response:', data);
      console.log('Edge Function error:', error);

      if (error) {
        console.error('Error from Edge Function:', error);
        throw new Error(error.message || 'Errore durante l\'invio del messaggio');
      }

      if (data?.error) {
        throw new Error(data.error);
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
          <DialogDescription>
            Compila il form per inviare un messaggio diretto agli amministratori. Riceverai una conferma dopo l'invio.
          </DialogDescription>
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

