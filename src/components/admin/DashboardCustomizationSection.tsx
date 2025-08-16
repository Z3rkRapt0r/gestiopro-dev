
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

interface DashboardSettings {
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

const DashboardCustomizationSection = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>({
    company_name: "",
    logo_url: null,
    primary_color: "#007bff",
    secondary_color: "#6c757d",
  });

  // Carica le impostazioni esistenti
  useEffect(() => {
    if (profile?.id) {
      loadSettings();
    }
  }, [profile?.id]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("*")
        .eq("admin_id", profile?.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading dashboard settings:", error);
        return;
      }

      if (data) {
        setSettings({
          company_name: data.company_name || "",
          logo_url: data.logo_url,
          primary_color: data.primary_color || "#007bff",
          secondary_color: data.secondary_color || "#6c757d",
        });
      }
    } catch (error) {
      console.error("Error loading dashboard settings:", error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo dashboard/logo/${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      setSettings(prev => ({ ...prev, logo_url: publicUrl }));

      toast({
        title: "Logo caricato",
        description: "Il logo è stato caricato con successo nella cartella 'logo dashboard/logo'",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento del logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings.logo_url || !profile?.id) return;

    setUploading(true);
    try {
      // Estrai il nome del file dall'URL
      const urlParts = settings.logo_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      console.log('Removing dashboard logo file:', fileName);

      // Elimina il file dal bucket di storage
      const { error: deleteError } = await supabase.storage
        .from("company-logos")
        .remove([`logo dashboard/logo/${fileName}`]);

      if (deleteError) {
        console.error("Error deleting dashboard logo file:", deleteError);
        throw deleteError;
      }

      // Aggiorna lo stato locale rimuovendo l'URL del logo
      setSettings(prev => ({ ...prev, logo_url: null }));

      toast({
        title: "Logo rimosso",
        description: "Il logo della dashboard è stato eliminato con successo dal sistema",
      });

      console.log('Dashboard logo file removed successfully:', fileName);
    } catch (error: any) {
      console.error("Error removing dashboard logo:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la rimozione del logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("dashboard_settings")
        .upsert(
          {
            admin_id: profile.id,
            company_name: settings.company_name,
            logo_url: settings.logo_url,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
          },
          {
            onConflict: "admin_id",
            ignoreDuplicates: false,
          }
        );

      if (error) {
        throw error;
      }

      toast({
        title: "Impostazioni salvate",
        description: "Le personalizzazioni dashboard sono state salvate con successo",
      });
    } catch (error: any) {
      console.error("Error saving dashboard settings:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il salvataggio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Personalizzazione Dashboard</h3>
        <p className="text-sm text-gray-600 mb-6">
          Personalizza l'aspetto globale della dashboard per tutti gli utenti.
        </p>
      </div>

      <div className="space-y-4">
        {/* Nome Azienda */}
        <div>
          <Label htmlFor="company_name">Nome Azienda</Label>
          <Input
            id="company_name"
            type="text"
            placeholder="Inserisci il nome dell'azienda"
            value={settings.company_name}
            onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
          />
        </div>

        {/* Logo Upload */}
        <div>
          <Label>Logo Aziendale</Label>
          <div className="mt-2">
            {settings.logo_url ? (
              <div className="flex items-center space-x-4">
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="h-16 w-auto object-contain border rounded"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Rimuovi
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Carica logo
                    </span>
                    <input
                      id="logo-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colori */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primary_color">Colore Primario</Label>
            <div className="flex items-center space-x-2">
              <input
                id="primary_color"
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                className="w-10 h-10 border rounded cursor-pointer"
              />
              <Input
                type="text"
                value={settings.primary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="secondary_color">Colore Secondario</Label>
            <div className="flex items-center space-x-2">
              <input
                id="secondary_color"
                type="color"
                value={settings.secondary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                className="w-10 h-10 border rounded cursor-pointer"
              />
              <Input
                type="text"
                value={settings.secondary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Anteprima */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-medium mb-3">Anteprima</h4>
          <div className="flex items-center space-x-4">
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo Preview"
                className="h-8 w-auto object-contain"
              />
            )}
            <h2 className="text-lg font-semibold" style={{ color: settings.primary_color }}>
              {settings.company_name || "Nome Azienda"}
            </h2>
          </div>
          <div className="mt-3 flex space-x-2">
            <div
              className="px-3 py-1 rounded text-white text-sm"
              style={{ backgroundColor: settings.primary_color }}
            >
              Primario
            </div>
            <div
              className="px-3 py-1 rounded text-white text-sm"
              style={{ backgroundColor: settings.secondary_color }}
            >
              Secondario
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading || uploading}
          className="w-full"
        >
          {loading ? "Salvataggio..." : "Salva Impostazioni"}
        </Button>
      </div>
    </div>
  );
};

export default DashboardCustomizationSection;
