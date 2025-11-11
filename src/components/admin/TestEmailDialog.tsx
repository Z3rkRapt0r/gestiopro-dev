
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
import { Mail, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TestEmailDialogProps {
  templateType: string;
  templateCategory?: string;
  subject: string;
  content: string;
  disabled?: boolean;
}

const TestEmailDialog = ({ 
  templateType, 
  templateCategory = "generale",
  subject, 
  content, 
  disabled 
}: TestEmailDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendTest = async () => {
    if (!testEmail || !profile?.id) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast({
        title: "Errore",
        description: "Inserisci un indirizzo email valido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const requestParams = {
        testEmail,
        subject,
        content,
        userId: profile.id,
        templateType,
        templateCategory
      };

      console.log('=== SENDING TEST EMAIL ===');
      console.log('Request params:', JSON.stringify(requestParams, null, 2));
      console.log('Profile:', profile);
      console.log('=========================');

      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          testEmail,
          subject,
          content,
          userId: profile.id,
          templateType,
          templateCategory
        }
      });

      if (error) {
        console.error('Test email error:', error);
        console.error('Test email error data:', data);

        let errorMessage = "Errore nell'invio dell'email di test";

        // Try to extract detailed error message
        if (data?.error) {
          errorMessage = data.error;
          if (data.details) {
            errorMessage += ` - ${data.details}`;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast({
          title: "Errore",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        console.log('Test email sent successfully:', data);
        toast({
          title: "Email di test inviata",
          description: `L'email di test è stata inviata a ${testEmail}`,
        });
        setTestEmail("");
        setOpen(false);
      }
    } catch (error: any) {
      console.error('Test email catch error:', error);
      console.error('Test email catch error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });

      let errorMessage = "Errore nell'invio dell'email di test";
      if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Mail className="w-4 h-4 mr-2" />
          Invia Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Invia Email di Test</DialogTitle>
          <DialogDescription>
            Invia un'email di prova per verificare il template "{templateType}"
            {templateCategory && ` (${templateCategory})`}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <strong>Come funziona:</strong> L'email conterrà dati di esempio (es: nome dipendente "Mario Rossi",
              date fittizie) per mostrare come apparirà il template compilato con i tuoi colori e stili personalizzati.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="test-email" className="text-right">
              Email
            </Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={profile?.email || "destinatario@esempio.com"}
              className="col-span-3"
            />
          </div>

          <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
            <div className="space-y-1">
              <div><strong>Oggetto:</strong> [TEST] {subject}</div>
              <div><strong>Anteprima contenuto:</strong> {content.substring(0, 80)}{content.length > 80 ? '...' : ''}</div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            💡 <strong>Suggerimento:</strong> Usa la tua email per vedere subito come appare il template nella tua casella di posta.
          </p>
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
            {loading ? "Invio in corso..." : "Invia Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestEmailDialog;
