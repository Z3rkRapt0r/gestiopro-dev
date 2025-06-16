
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface NotifyAdminParams {
  requestId: string;
  employeeName: string;
  type: "permesso" | "ferie";
  details: string;
}

interface NotifyEmployeeParams {
  requestId: string;
  employeeId: string;
  status: "approved" | "rejected";
  adminNote?: string;
  type: "permesso" | "ferie";
  details: string;
}

export const useLeaveRequestNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const notifyAdmin = async ({ requestId, employeeName, type, details }: NotifyAdminParams) => {
    setLoading(true);
    try {
      console.log('Sending leave request notification to admin:', { requestId, employeeName, type, details });

      const subject = `Nuova richiesta ${type} da ${employeeName}`;
      const message = `${employeeName} ha inviato una nuova richiesta di ${type}.`;
      const body = `${details}\n\nAccedi alla dashboard per approvare o rifiutare la richiesta.`;

      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          recipientId: null, // Invia a tutti gli admin
          subject,
          shortText: message,
          body,
          userId: profile?.id,
          topic: 'permessi-richiesta'
        }
      });

      if (error) {
        console.error('Error sending admin notification:', error);
        toast({
          title: "Avviso",
          description: "Richiesta salvata ma errore nell'invio email all'amministratore",
          variant: "destructive",
        });
      } else {
        console.log('Admin notification sent successfully:', data);
      }
    } catch (error: any) {
      console.error('Error in notifyAdmin:', error);
    } finally {
      setLoading(false);
    }
  };

  const notifyEmployee = async ({ requestId, employeeId, status, adminNote, type, details }: NotifyEmployeeParams) => {
    setLoading(true);
    try {
      console.log('Sending leave request status notification to employee:', { requestId, employeeId, status, type, adminNote });

      const statusText = status === 'approved' ? 'approvata' : 'rifiutata';
      const subject = `Richiesta ${type} ${statusText}`;
      const message = `La tua richiesta di ${type} è stata ${statusText}.`;
      const body = details;

      const topic = status === 'approved' ? 'permessi-approvazione' : 'permessi-rifiuto';

      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          recipientId: employeeId,
          subject,
          shortText: message,
          body,
          adminNote,
          userId: profile?.id,
          topic
        }
      });

      if (error) {
        console.error('Error sending employee notification:', error);
        toast({
          title: "Avviso",
          description: "Stato aggiornato ma errore nell'invio email al dipendente",
          variant: "destructive",
        });
      } else {
        console.log('Employee notification sent successfully:', data);
        toast({
          title: "Notifica inviata",
          description: "Il dipendente è stato notificato via email",
        });
      }
    } catch (error: any) {
      console.error('Error in notifyEmployee:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    notifyAdmin,
    notifyEmployee,
    loading,
  };
};
