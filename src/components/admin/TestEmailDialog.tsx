
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";

interface TestEmailDialogProps {
  templateType: 'documenti' | 'notifiche' | 'approvazioni' | 'generale' | 'permessi-richiesta' | 'permessi-approvazione' | 'permessi-rifiuto';
  subject: string;
  content: string;
  disabled?: boolean;
}

const TestEmailDialog = ({ templateType, subject, content, disabled }: TestEmailDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendTest = async () => {
    if (!testEmail || !profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          testEmail,
          subject,
          content,
          userId: profile.id,
          templateType // Pass the template type to use correct template
        }
      });

      if (error) {
        console.error('Test email error:', error);
        toast({
          title: "Errore",
          description: error.message || "Errore nell'invio dell'email di test",
          variant: "destructive",
        });
      } else {
        console.log('Test email sent:', data);
        toast({
          title: "Email di test inviata",
          description: `L'email di test è stata inviata a ${testEmail}`,
        });
        setTestEmail("");
        setOpen(false);
      }
    } catch (error: any) {
      console.error('Test email error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'invio dell'email di test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Mail className="w-4 h-4 mr-2" />
          Invia Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invia Email di Test</DialogTitle>
          <DialogDescription>
            Invia un'email di prova per verificare il template {templateType}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="test-email" className="text-right">
              Email
            </Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="destinatario@esempio.com"
              className="col-span-3"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Oggetto:</strong> {subject}<br />
            <strong>Contenuto:</strong> {content.substring(0, 100)}...
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleSendTest}
            disabled={loading || !testEmail}
          >
            {loading ? "Invio..." : "Invia Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestEmailDialog;
