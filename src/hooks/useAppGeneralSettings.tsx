import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AppGeneralSettings {
  app_title: string;
  app_description: string;
}

export function useAppGeneralSettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppGeneralSettings>({
    app_title: "SerramentiCorp - Gestione Aziendale",
    app_description: "Sistema di gestione aziendale per imprese di serramenti",
  });
  const [loading, setLoading] = useState(false);
  const [publicSettings, setPublicSettings] = useState<AppGeneralSettings | null>(null);

  // Carica le impostazioni personalizzate dell'admin
  useEffect(() => {
    if (profile?.role === "admin" && profile?.id) {
      loadAdminSettings();
    }
  }, [profile]);

  // Carica le impostazioni pubbliche (per tutti gli utenti)
  useEffect(() => {
    loadPublicSettings();
  }, []);

  const loadAdminSettings = async () => {
    try {
      console.log("Loading admin app settings from database...");
      
      // Prova a caricare dal database
      const { data, error } = await supabase
        .from("app_general_settings")
        .select("*")
        .eq("admin_id", profile.id)
        .maybeSingle();
      
      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          console.log("Table app_general_settings doesn't exist yet, using defaults");
          setSettings({
            app_title: "SerramentiCorp - Gestione Aziendale",
            app_description: "Sistema di gestione aziendale per imprese di serramenti",
          });
          return;
        }
        throw error;
      }
      
      if (data) {
        console.log("Loaded settings from database:", data);
        setSettings({
          app_title: data.app_title || "SerramentiCorp - Gestione Aziendale",
          app_description: data.app_description || "Sistema di gestione aziendale per imprese di serramenti",
        });
      } else {
        console.log("No settings found in database, using defaults");
        setSettings({
          app_title: "SerramentiCorp - Gestione Aziendale",
          app_description: "Sistema di gestione aziendale per imprese di serramenti",
        });
      }
      
    } catch (error) {
      console.error("Error loading admin app settings:", error);
      // Fallback alle impostazioni di default
      setSettings({
        app_title: "SerramentiCorp - Gestione Aziendale",
        app_description: "Sistema di gestione aziendale per imprese di serramenti",
      });
    }
  };

  const loadPublicSettings = async () => {
    try {
      console.log("Loading public app settings from database...");
      
      // Prova a caricare dal database
      const { data, error } = await supabase
        .from("app_general_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          console.log("Table app_general_settings doesn't exist yet, using defaults");
          setPublicSettings({
            app_title: "SerramentiCorp - Gestione Aziendale",
            app_description: "Sistema di gestione aziendale per imprese di serramenti",
          });
          return;
        }
        throw error;
      }
      
      if (data) {
        console.log("Loaded public settings from database:", data);
        setPublicSettings({
          app_title: data.app_title || "SerramentiCorp - Gestione Aziendale",
          app_description: data.app_description || "Sistema di gestione aziendale per imprese di serramenti",
        });
      } else {
        console.log("No public settings found in database, using defaults");
        setPublicSettings({
          app_title: "SerramentiCorp - Gestione Aziendale",
          app_description: "Sistema di gestione aziendale per imprese di serramenti",
        });
      }
      
    } catch (error) {
      console.error("Error loading public app settings:", error);
      // Fallback alle impostazioni di default
      setPublicSettings({
        app_title: "SerramentiCorp - Gestione Aziendale",
        app_description: "Sistema di gestione aziendale per imprese di serramenti",
      });
    }
  };

  const saveSettings = async (newSettings: AppGeneralSettings) => {
    if (!profile?.id) {
      toast({
        title: "Errore",
        description: "Profilo utente non caricato. Riprova.",
        variant: "destructive",
      });
      return;
    }

    if (!newSettings.app_title.trim()) {
      toast({
        title: "Errore",
        description: "Il titolo dell'applicazione non può essere vuoto.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Prova prima a salvare nel database
      const { error } = await supabase
        .from("app_general_settings")
        .upsert(
          { 
            admin_id: profile.id,
            app_title: newSettings.app_title.trim(),
            app_description: newSettings.app_description.trim() || null,
          },
          { 
            onConflict: "admin_id",
            ignoreDuplicates: false 
          }
        );

      if (error) {
        // Se la tabella non esiste ancora, salva localmente
        if (error.code === '42P01') { // Table doesn't exist
          console.log("Table app_general_settings doesn't exist yet, saving locally");
          setSettings(newSettings);
          setPublicSettings(newSettings);
          document.title = newSettings.app_title;
          
          toast({
            title: "Impostazioni salvate localmente",
            description: "La tabella del database non è ancora stata creata. Le impostazioni sono salvate temporaneamente. Esegui lo script SQL per creare la tabella.",
            variant: "default",
          });
          return;
        }
        
        // Altri errori del database
        throw error;
      }

      // Salvataggio nel database riuscito
      setSettings(newSettings);
      setPublicSettings(newSettings);
      document.title = newSettings.app_title;
      
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni generali dell'applicazione sono state salvate con successo nel database.",
      });
      
      console.log("Settings saved to database:", newSettings);
      
    } catch (error: any) {
      console.error("Error saving app general settings:", error);
      
      // Fallback al salvataggio locale
      setSettings(newSettings);
      setPublicSettings(newSettings);
      document.title = newSettings.app_title;
      
      toast({
        title: "Salvataggio locale",
        description: "Errore nel salvataggio nel database. Le impostazioni sono state salvate localmente. Verifica la connessione al database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Funzione per ottenere il titolo corrente (admin o pubblico)
  const getCurrentTitle = () => {
    if (profile?.role === "admin") {
      return settings.app_title;
    }
    return publicSettings?.app_title || "SerramentiCorp - Gestione Aziendale";
  };

  // Funzione per ottenere la descrizione corrente (admin o pubblica)
  const getCurrentDescription = () => {
    if (profile?.role === "admin") {
      return settings.app_description;
    }
    return publicSettings?.app_description || "Sistema di gestione aziendale per imprese di serramenti";
  };

  return {
    settings,
    setSettings,
    loading,
    saveSettings,
    getCurrentTitle,
    getCurrentDescription,
    publicSettings,
  };
}
