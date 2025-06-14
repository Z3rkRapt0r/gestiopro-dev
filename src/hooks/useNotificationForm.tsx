
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

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          sender_id: profile?.id,
          recipient_id: recipientId,
          is_global: recipientId == null,
          subject,
          short_text: shortText,
          body,
          attachment_url,
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // Edge function - send email
      const emailPayload = {
        recipientId,
        subject,
        shortText,
        notificationId: data.id,
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
