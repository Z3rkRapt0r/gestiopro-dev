
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function useAdminSettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === "admin" && profile?.id) {
      setLoading(true);
      (async () => {
        try {
          const { data } = await supabase
            .from("admin_settings")
            .select("brevo_api_key")
            .eq("admin_id", profile.id)
            .maybeSingle();
          setApiKey(data?.brevo_api_key || "");
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

  return { apiKey, loading, saveApiKey };
}
