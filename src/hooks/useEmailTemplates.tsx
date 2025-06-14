
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  is_default: boolean;
  created_at: string;
}

export const useEmailTemplates = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTemplates = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("admin_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error loading templates:", error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: Omit<EmailTemplate, "id" | "created_at">) => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .insert({
          admin_id: profile.id,
          name: template.name,
          subject: template.subject,
          content: template.content,
          is_default: template.is_default,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      toast({
        title: "Template salvato",
        description: "Il template è stato salvato con successo",
      });
      
      return data;
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio del template",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast({
        title: "Template eliminato",
        description: "Il template è stato eliminato con successo",
      });
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione del template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async (templateId: string, testEmail: string) => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error("Template non trovato");

      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          templateId,
          testEmail,
          userId: profile.id,
          subject: template.subject,
          content: template.content,
        }
      });

      if (error) throw error;

      toast({
        title: "Email di prova inviata",
        description: `Email di prova inviata a ${testEmail}`,
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast({
        title: "Errore",
        description: "Errore nell'invio dell'email di prova",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "admin") {
      loadTemplates();
    }
  }, [profile]);

  return {
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
    sendTestEmail,
    refreshTemplates: loadTemplates,
  };
};
