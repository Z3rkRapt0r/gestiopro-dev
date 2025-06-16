
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Building } from "lucide-react";

interface EmployeeLogosSettings {
  employee_default_logo_url: string | null;
  employee_logo_enabled: boolean;
}

const EmployeeLogosSection = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<EmployeeLogosSettings>({
    employee_default_logo_url: null,
    employee_logo_enabled: true,
  });

  useEffect(() => {
    if (profile?.id) {
      loadSettings();
    }
  }, [profile?.id]);

  const loadSettings = async () => {
    try {
      console.log('Loading employee logos settings from new table...');
      const { data, error } = await supabase
        .from("employee_logo_settings")
        .select("employee_default_logo_url, employee_logo_enabled")
        .eq("admin_id", profile?.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading employee logos settings:", error);
        return;
      }

      console.log('Employee logos settings loaded:', data);

      if (data) {
        setSettings({
          employee_default_logo_url: data.employee_default_logo_url,
          employee_logo_enabled: data.employee_logo_enabled ?? true,
        });
      }
    } catch (error) {
      console.error("Error loading employee logos settings:", error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `employee-default-${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      setSettings(prev => ({ ...prev, employee_default_logo_url: publicUrl }));

      toast({
        title: "Logo dipendenti caricato",
        description: "Il logo di default per i dipendenti è stato caricato con successo",
      });
    } catch (error: any) {
      console.error("Error uploading employee logo:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento del logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, employee_default_logo_url: null }));
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      console.log('Saving employee logos settings to new table...');
      const { error } = await supabase
        .from("employee_logo_settings")
        .upsert(
          {
            admin_id: profile.id,
            employee_default_logo_url: settings.employee_default_logo_url,
            employee_logo_enabled: settings.employee_logo_enabled,
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
        title: "Impostazioni loghi dipendenti salvate",
        description: "Le impostazioni per i loghi dei dipendenti sono state salvate con successo",
      });
    } catch (error: any) {
      console.error("Error saving employee logos settings:", error);
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
        <h3 className="text-lg font-semibold mb-4">Logo per Dashboard Dipendenti</h3>
        <p className="text-sm text-gray-600 mb-6">
          Gestisci il logo di default che vedranno i dipendenti nella loro dashboard. Questo logo sostituirà l'icona SVG nell'header.
        </p>
      </div>

      <div className="space-y-4">
        {/* Abilita/Disabilita Logo Dipendenti */}
        <div className="flex items-center space-x-3">
          <input
            id="employee_logo_enabled"
            type="checkbox"
            checked={settings.employee_logo_enabled}
            onChange={(e) => setSettings(prev => ({ ...prev, employee_logo_enabled: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <Label htmlFor="employee_logo_enabled">
            Mostra logo personalizzato ai dipendenti (sostituisce l'icona SVG)
          </Label>
        </div>

        {settings.employee_logo_enabled && (
          <>
            {/* Logo Dipendenti Upload */}
            <div>
              <Label>Logo di Default per Dipendenti</Label>
              <div className="mt-2">
                {settings.employee_default_logo_url ? (
                  <div className="flex items-center space-x-4">
                    <img
                      src={settings.employee_default_logo_url}
                      alt="Logo Dipendenti"
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
                      <label htmlFor="employee-logo-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Carica logo per dipendenti
                        </span>
                        <input
                          id="employee-logo-upload"
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

            {/* Anteprima Dashboard Dipendente */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="text-sm font-medium mb-3">Anteprima Header Dashboard Dipendente</h4>
              <div className="bg-white shadow-sm border-b p-4 rounded">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {settings.employee_default_logo_url ? (
                      <img
                        src={settings.employee_default_logo_url}
                        alt="Logo Preview"
                        className="h-8 w-auto object-contain"
                      />
                    ) : (
                      <div className="bg-blue-600 p-2 rounded">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div className="ml-4">
                      <h1 className="text-xl font-semibold text-blue-600">
                        Azienda - Gestionale
                      </h1>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Benvenuto Mario Rossi
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={loading || uploading}
          className="w-full"
        >
          {loading ? "Salvataggio..." : "Salva Impostazioni Loghi Dipendenti"}
        </Button>
      </div>
    </div>
  );
};

export default EmployeeLogosSection;
