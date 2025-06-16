
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
      console.log('useNotificationForm: Starting notification send process');
      console.log('Parameters:', { recipientId, subject, shortText, body, topic });
      
      let attachment_url: string | null = null;

      if (file) {
        console.log('useNotificationForm: Uploading file...');
        const filename = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("notification-attachments")
          .upload(filename, file);

        if (error) {
          console.error('File upload error:', error);
          throw error;
        }
        attachment_url = data?.path || null;
        console.log('File uploaded successfully:', attachment_url);
      }

      const notificationData = {
        title: subject,
        message: shortText,
        type: topic || "system",
        body,
        attachment_url,
        created_by: profile?.id
      };

      console.log('Notification data to insert:', notificationData);

      if (!recipientId) {
        // Tutti i dipendenti
        console.log('useNotificationForm: Sending to all employees');
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .eq("is_active", true);
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        console.log('Found active profiles:', profiles);

        // Per ogni dipendente attivo, crea una notifica
        for (const p of profiles || []) {
          console.log('Creating notification for user:', p.id, p.email);
          
          const { error: insertError } = await supabase
            .from("notifications")
            .insert({
              user_id: p.id,
              ...notificationData
            });
            
          if (insertError) {
            console.error('Error inserting notification for user:', p.id, insertError);
            throw insertError;
          }
          
          console.log('Notification created successfully for user:', p.id);
        }
      } else {
        // Notifica singolo dipendente
        console.log('useNotificationForm: Sending to single employee:', recipientId);
        
        const { error: insertError } = await supabase
          .from("notifications")
          .insert({
            user_id: recipientId,
            ...notificationData
          });
          
        if (insertError) {
          console.error('Error inserting notification:', insertError);
          throw insertError;
        }
        
        console.log('Notification created successfully for user:', recipientId);
      }

      // Salva nella cronologia delle notifiche inviate
      console.log("Saving to sent_notifications table...");
      const { error: sentNotificationError } = await supabase
        .from("sent_notifications")
        .insert({
          admin_id: profile?.id,
          recipient_id: recipientId,
          title: subject,
          message: shortText,
          body,
          type: topic || "system",
          attachment_url
        });

      if (sentNotificationError) {
        console.error("Error saving to sent_notifications:", sentNotificationError);
        throw sentNotificationError;
      }

      console.log("Successfully saved to sent_notifications table");

      // Invio email tramite Edge Function Brevo
      console.log("Calling send-notification-email function...");
      
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        'send-notification-email',
        {
          body: {
            recipientId,
            subject,
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
      
      // Chiama onCreated con un piccolo delay per assicurarsi che il database sia aggiornato
      console.log("useNotificationForm: calling onCreated callback after delay");
      setTimeout(() => {
        onCreated?.();
      }, 100);
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
