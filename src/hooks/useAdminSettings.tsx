
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
    if (profile?.role === "admin") {
      setLoading(true);
      supabase
        .from("admin_settings")
        .select("brevo_api_key")
        .eq("admin_id", profile?.id)
        .maybeSingle()
        .then(({ data }) => {
          setApiKey(data?.brevo_api_key || "");
        })
        .finally(() => setLoading(false));
    }
  }, [profile]);

  const saveApiKey = async (key: string) => {
    setLoading(true);
    let { error } = await supabase
      .from("admin_settings")
      .upsert(
        { admin_id: profile?.id, brevo_api_key: key },
        { onConflict: "admin_id" }
      );
    setLoading(false);
    if (!error) {
      setApiKey(key);
      toast({
        title: "Chiave salvata",
        description: "Chiave Brevo aggiornata con successo.",
      });
    } else {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return { apiKey, loading, saveApiKey };
}
