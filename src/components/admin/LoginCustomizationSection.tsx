import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

interface LoginSettings {
  login_logo_url: string | null;
  login_company_name: string;
  login_primary_color: string;
  login_secondary_color: string;
  login_background_color: string;
}

const LoginCustomizationSection = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<LoginSettings>({
    login_logo_url: null,
    login_company_name: "SerramentiCorp",
    login_primary_color: "#2563eb",
    login_secondary_color: "#64748b",
    login_background_color: "#f1f5f9",
  });

  useEffect(() => {
    if (profile?.id) {
      loadSettings();
    }
  }, [profile?.id]);

  const loadSettings = async () => {
    try {
      console.log('LoadSettings - profile?.id:', profile?.id);
      
      // Prima verifichiamo se esistono impostazioni per questo admin
      const { data: existingSettings, error: fetchError } = await supabase
        .from("dashboard_settings")
        .select("*")
        .eq("admin_id", profile?.id)
        .maybeSingle();

      console.log('Existing settings for admin:', existingSettings);
      console.log('Fetch error:', fetchError);

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error loading login settings:", fetchError);
        return;
      }

      if (existingSettings) {
        setSettings({
          login_logo_url: existingSettings.login_logo_url,
          login_company_name: existingSettings.login_company_name || "SerramentiCorp",
          login_primary_color: existingSettings.login_primary_color || "#2563eb",
          login_secondary_color: existingSettings.login_secondary_color || "#64748b",
          login_background_color: existingSettings.login_background_color || "#f1f5f9",
        });
        console.log('Loaded existing settings');
      } else {
        console.log('No existing settings found, using defaults');
      }
    } catch (error) {
      console.error("Error loading login settings:", error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `login-${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      setSettings(prev => ({ ...prev, login_logo_url: publicUrl }));

      toast({
        title: "Logo login caricato",
        description: "Il logo per la pagina di login è stato caricato con successo",
      });
    } catch (error: any) {
      console.error("Error uploading login logo:", error);
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
    setSettings(prev => ({ ...prev, login_logo_url: null }));
  };

  const handleSave = async () => {
    if (!profile?.id) {
      toast({
        title: "Errore",
        description: "Profilo admin non trovato. Effettua nuovamente il login.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Saving login settings for admin_id:', profile.id);
      console.log('Settings to save:', settings);

      // Prima verifichiamo se esiste già una riga per questo admin
      const { data: existingRow } = await supabase
        .from("dashboard_settings")
        .select("id")
        .eq("admin_id", profile.id)
        .maybeSingle();

      console.log('Existing row:', existingRow);

      let result;
      
      if (existingRow) {
        // Aggiorna la riga esistente
        result = await supabase
          .from("dashboard_settings")
          .update({
            login_logo_url: settings.login_logo_url,
            login_company_name: settings.login_company_name,
            login_primary_color: settings.login_primary_color,
            login_secondary_color: settings.login_secondary_color,
            login_background_color: settings.login_background_color,
            updated_at: new Date().toISOString(),
          })
          .eq("admin_id", profile.id)
          .select();
      } else {
        // Crea una nuova riga
        result = await supabase
          .from("dashboard_settings")
          .insert({
            admin_id: profile.id,
            login_logo_url: settings.login_logo_url,
            login_company_name: settings.login_company_name,
            login_primary_color: settings.login_primary_color,
            login_secondary_color: settings.login_secondary_color,
            login_background_color: settings.login_background_color,
          })
          .select();
      }

      console.log('Save result:', result);

      if (result.error) {
        throw result.error;
      }

      // Verifichiamo che i dati siano stati salvati
      const { data: verification } = await supabase
        .from("dashboard_settings")
        .select("*")
        .eq("admin_id", profile.id)
        .maybeSingle();

      console.log('Verification after save:', verification);

      toast({
        title: "Impostazioni login salvate",
        description: "Le personalizzazioni della pagina di login sono state salvate con successo",
      });
    } catch (error: any) {
      console.error("Error saving login settings:", error);
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
        <h3 className="text-lg font-semibold mb-4">Personalizzazione Pagina di Login</h3>
        <p className="text-sm text-gray-600 mb-6">
          Personalizza l'aspetto della pagina di login con logo, nome azienda e colori.
        </p>
      </div>

      <div className="space-y-4">
        {/* Nome Azienda Login */}
        <div>
          <Label htmlFor="login_company_name">Nome Azienda per Login</Label>
          <Input
            id="login_company_name"
            type="text"
            placeholder="Inserisci il nome dell'azienda per il login"
            value={settings.login_company_name}
            onChange={(e) => setSettings(prev => ({ ...prev, login_company_name: e.target.value }))}
          />
        </div>

        {/* Logo Login Upload */}
        <div>
          <Label>Logo per Pagina di Login</Label>
          <div className="mt-2">
            {settings.login_logo_url ? (
              <div className="flex items-center space-x-4">
                <img
                  src={settings.login_logo_url}
                  alt="Logo Login"
                  className="h-16 w-auto object-contain border rounded"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, login_logo_url: null }))}
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
                  <label htmlFor="login-logo-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Carica logo per login
                    </span>
                    <input
                      id="login-logo-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file || !profile?.id) return;

                        setUploading(true);
                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `login-${profile.id}-${Date.now()}.${fileExt}`;

                          const { error: uploadError } = await supabase.storage
                            .from("company-logos")
                            .upload(fileName, file);

                          if (uploadError) {
                            throw uploadError;
                          }

                          const { data: { publicUrl } } = supabase.storage
                            .from("company-logos")
                            .getPublicUrl(fileName);

                          setSettings(prev => ({ ...prev, login_logo_url: publicUrl }));

                          toast({
                            title: "Logo login caricato",
                            description: "Il logo per la pagina di login è stato caricato con successo",
                          });
                        } catch (error: any) {
                          console.error("Error uploading login logo:", error);
                          toast({
                            title: "Errore",
                            description: error.message || "Errore durante il caricamento del logo",
                            variant: "destructive",
                          });
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colori Login */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="login_primary_color">Colore Primario Login</Label>
            <div className="flex items-center space-x-2">
              <input
                id="login_primary_color"
                type="color"
                value={settings.login_primary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, login_primary_color: e.target.value }))}
                className="w-10 h-10 border rounded cursor-pointer"
              />
              <Input
                type="text"
                value={settings.login_primary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, login_primary_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="login_secondary_color">Colore Secondario Login</Label>
            <div className="flex items-center space-x-2">
              <input
                id="login_secondary_color"
                type="color"
                value={settings.login_secondary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, login_secondary_color: e.target.value }))}
                className="w-10 h-10 border rounded cursor-pointer"
              />
              <Input
                type="text"
                value={settings.login_secondary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, login_secondary_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="login_background_color">Colore Sfondo Login</Label>
            <div className="flex items-center space-x-2">
              <input
                id="login_background_color"
                type="color"
                value={settings.login_background_color}
                onChange={(e) => setSettings(prev => ({ ...prev, login_background_color: e.target.value }))}
                className="w-10 h-10 border rounded cursor-pointer"
              />
              <Input
                type="text"
                value={settings.login_background_color}
                onChange={(e) => setSettings(prev => ({ ...prev, login_background_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Anteprima Login */}
        <div className="border rounded-lg p-6" style={{ backgroundColor: settings.login_background_color }}>
          <h4 className="text-sm font-medium mb-4 text-gray-900">Anteprima Pagina di Login</h4>
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              {settings.login_logo_url && (
                <div className="flex justify-center mb-4">
                  <img
                    src={settings.login_logo_url}
                    alt="Logo Preview"
                    className="h-12 w-auto object-contain"
                  />
                </div>
              )}
              <h1 className="text-2xl font-bold mb-2" style={{ color: settings.login_primary_color }}>
                {settings.login_company_name}
              </h1>
              <p style={{ color: settings.login_secondary_color }}>
                Sistema di Gestione Aziendale
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  type="email" 
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="tua.email@esempio.com"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input 
                  type="password" 
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="••••••••"
                  disabled
                />
              </div>
              <button 
                className="w-full py-2 px-4 rounded text-white font-medium"
                style={{ backgroundColor: settings.login_primary_color }}
                disabled
              >
                Accedi
              </button>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading || uploading}
          className="w-full"
        >
          {loading ? "Salvataggio..." : "Salva Impostazioni Login"}
        </Button>
      </div>
    </div>
  );
};

export default LoginCustomizationSection;
