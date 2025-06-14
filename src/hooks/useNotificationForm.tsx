
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface NotificationInput {
  recipientId: string | null; // null for ALL
  subject: string;
  shortText: string;
  body?: string;
  file?: File | null;
  topic?: string;
}

export const useNotificationForm = (onCreated?: () => void) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sendNotification = async ({
    recipientId,
    subject,
    shortText,
    body,
    file,
    topic,
  }: NotificationInput) => {
    setLoading(true);

    try {
      let attachment_url: string | null = null;

      if (file) {
        const filename = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("notification-attachments")
          .upload(filename, file);

        if (error) throw error;
        attachment_url = data?.path || null;
      }

      if (!recipientId) {
        // Tutti i dipendenti
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_active", true);
        if (profilesError) throw profilesError;

        // Per ogni dipendente attivo, crea una notifica
        for (const p of profiles || []) {
          await supabase
            .from("notifications")
            .insert({
              user_id: p.id,
              title: subject,
              message: shortText,
              type: topic || "system",
              body,
              attachment_url,
              created_by: profile?.id
            });
        }
      } else {
        // Notifica singolo dipendente
        await supabase
          .from("notifications")
          .insert({
            user_id: recipientId,
            title: subject,
            message: shortText,
            type: topic || "system",
            body,
            attachment_url,
            created_by: profile?.id
          });
      }

      // Invio email tramite Edge Function Brevo
      console.log("Calling send-notification-email function...");
      
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        'send-notification-email',
        {
          body: {
            recipientId,
            subject: topic || subject,
            shortText,
            userId: profile?.id,
          }
        }
      );

      if (emailError) {
        console.error("Email function error:", emailError);
        toast({
          title: "Notifica salvata",
          description: "La notifica è stata salvata ma l'invio email ha avuto problemi: " + emailError.message,
          variant: "destructive",
        });
      } else {
        console.log("Email function success:", emailResult);
        toast({
          title: "Notifica inviata",
          description: "La notifica è stata inviata e l'email è stata spedita con successo.",
        });
      }
      
      onCreated?.();
    } catch (e: any) {
      console.error("Notification error:", e);
      toast({
        title: "Errore",
        description: e.message || "Errore nell'invio notifica.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { sendNotification, loading };
};
