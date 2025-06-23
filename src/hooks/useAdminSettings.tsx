
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BrevoSettings {
  apiKey: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  enableNotifications: boolean;
  enableDocumentNotifications: boolean;
  enableAttendanceNotifications: boolean;
  enableLeaveNotifications: boolean;
  enableWelcomeEmails: boolean;
  emailSignature: string;
  trackOpens: boolean;
  trackClicks: boolean;
  autoRetry: boolean;
  maxRetries: number;
}

export function useAdminSettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [brevoSettings, setBrevoSettings] = useState<BrevoSettings>({
    apiKey: '',
    senderName: '',
    senderEmail: '',
    replyTo: '',
    enableNotifications: true,
    enableDocumentNotifications: true,
    enableAttendanceNotifications: true,
    enableLeaveNotifications: true,
    enableWelcomeEmails: true,
    emailSignature: '',
    trackOpens: true,
    trackClicks: true,
    autoRetry: true,
    maxRetries: 3
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === "admin" && profile?.id) {
      setLoading(true);
      (async () => {
        try {
          const { data } = await supabase
            .from("admin_settings")
            .select("*")
            .eq("admin_id", profile.id)
            .maybeSingle();
          
          if (data) {
            setApiKey(data.brevo_api_key || "");
            setBrevoSettings({
              apiKey: data.brevo_api_key || '',
              senderName: data.sender_name || '',
              senderEmail: data.sender_email || '',
              replyTo: data.reply_to || '',
              enableNotifications: data.enable_notifications ?? true,
              enableDocumentNotifications: data.enable_document_notifications ?? true,
              enableAttendanceNotifications: data.enable_attendance_notifications ?? true,
              enableLeaveNotifications: data.enable_leave_notifications ?? true,
              enableWelcomeEmails: data.enable_welcome_emails ?? true,
              emailSignature: data.email_signature || '',
              trackOpens: data.track_opens ?? true,
              trackClicks: data.track_clicks ?? true,
              autoRetry: data.auto_retry ?? true,
              maxRetries: data.max_retries ?? 3
            });
          }
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [profile]);

  const saveApiKey = async (key: string) => {
    if (!profile?.id) {
      toast({
        title: "Errore",
        description: "Profilo utente non caricato. Riprova.",
        variant: "destructive",
      });
      return;
    }

    if (!key.trim()) {
      toast({
        title: "Errore",
        description: "La chiave API non può essere vuota.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert(
          { 
            admin_id: profile.id, 
            brevo_api_key: key.trim() 
          },
          { 
            onConflict: "admin_id",
            ignoreDuplicates: false 
          }
        );

      if (error) {
        console.error("Error saving API key:", error);
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setApiKey(key.trim());
        setBrevoSettings(prev => ({ ...prev, apiKey: key.trim() }));
        toast({
          title: "Chiave salvata",
          description: "Chiave Brevo aggiornata con successo.",
        });
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore imprevisto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBrevoSettings = async (settings: BrevoSettings) => {
    if (!profile?.id) {
      toast({
        title: "Errore",
        description: "Profilo utente non caricato. Riprova.",
        variant: "destructive",
      });
      return;
    }

    if (!settings.apiKey.trim()) {
      toast({
        title: "Errore",
        description: "La chiave API non può essere vuota.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert(
          { 
            admin_id: profile.id,
            brevo_api_key: settings.apiKey.trim(),
            sender_name: settings.senderName.trim() || null,
            sender_email: settings.senderEmail.trim() || null,
            reply_to: settings.replyTo.trim() || null,
            email_signature: settings.emailSignature.trim() || null,
            enable_notifications: settings.enableNotifications,
            enable_document_notifications: settings.enableDocumentNotifications,
            enable_attendance_notifications: settings.enableAttendanceNotifications,
            enable_leave_notifications: settings.enableLeaveNotifications,
            enable_welcome_emails: settings.enableWelcomeEmails,
            track_opens: settings.trackOpens,
            track_clicks: settings.trackClicks,
            auto_retry: settings.autoRetry,
            max_retries: settings.maxRetries
          },
          { 
            onConflict: "admin_id",
            ignoreDuplicates: false 
          }
        );

      if (error) {
        console.error("Error saving Brevo settings:", error);
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setApiKey(settings.apiKey.trim());
        setBrevoSettings(settings);
        toast({
          title: "Configurazione salvata",
          description: "Impostazioni Brevo aggiornate con successo.",
        });
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore imprevisto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { 
    apiKey, 
    brevoSettings, 
    setBrevoSettings, 
    loading, 
    saveApiKey, 
    saveBrevoSettings 
  };
}
