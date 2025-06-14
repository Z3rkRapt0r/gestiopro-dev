
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

      // Se recipientId is null, invia a tutti ("general") -> per ogni utente attivo
      if (!recipientId) {
        // Fetch all active employee profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_active", true);
        if (profilesError) throw profilesError;

        // For each employee, create a notification
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
        // Notifica personale
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

      // Edge function - send email
      // Qui si manda la notifica email tramite edge solo a uno o più
      const emailPayload = {
        recipientId,
        subject,
        shortText,
        // notificationId: // non è più one2one, quindi lo lasciamo undefined
      };
      await fetch("/functions/v1/send-notification-email", {
        method: "POST",
        body: JSON.stringify(emailPayload),
        headers: { "Content-Type": "application/json" },
      });

      toast({
        title: "Notifica inviata",
        description: "La notifica è stata inviata e il destinatario riceverà una email.",
      });
      onCreated?.();
    } catch (e: any) {
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
