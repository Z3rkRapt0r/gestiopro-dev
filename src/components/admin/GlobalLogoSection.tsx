import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Image, Settings } from "lucide-react";

const GlobalLogoSection = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [globalLogoUrl, setGlobalLogoUrl] = useState<string>("");
  const [globalLogoAlignment, setGlobalLogoAlignment] = useState<string>("center");
  const [globalLogoSize, setGlobalLogoSize] = useState<string>("medium");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load current settings
  useEffect(() => {
    if (profile?.id) {
      loadGlobalLogoSettings();
    }
  }, [profile?.id]);

  const loadGlobalLogoSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("global_logo_url, global_logo_alignment, global_logo_size")
        .eq("admin_id", profile?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading global logo settings:", error);
        return;
      }

      if (data) {
        setGlobalLogoUrl(data.global_logo_url || "");
        setGlobalLogoAlignment(data.global_logo_alignment || "center");
        setGlobalLogoSize(data.global_logo_size || "medium");
      }
    } catch (error) {
      console.error("Error loading global logo settings:", error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `Logo Globale per Email/logo/${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setGlobalLogoUrl(publicUrl);
      
      toast({
        title: "Logo caricato",
        description: "Il logo globale è stato caricato con successo nella cartella 'Logo Globale per Email/logo'",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento del logo: " + error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!globalLogoUrl || !profile?.id) return;

    setUploading(true);
    try {
      // Estrai il nome del file dall'URL
      const urlParts = globalLogoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      console.log('Removing global logo file:', fileName);

      // Elimina il file dal bucket di storage
      const { error: deleteError } = await supabase.storage
        .from("company-logos")
        .remove([`Logo Globale per Email/logo/${fileName}`]);

      if (deleteError) {
        console.error("Error deleting global logo file:", deleteError);
        throw deleteError;
      }

      // Aggiorna lo stato locale rimuovendo l'URL del logo
      setGlobalLogoUrl("");

      toast({
        title: "Logo rimosso",
        description: "Il logo globale è stato eliminato con successo dal sistema",
      });

      console.log('Global logo file removed successfully:', fileName);
    } catch (error: any) {
      console.error("Error removing global logo:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la rimozione del logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // First, try to update existing record
      const { data: existingData, error: fetchError } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("admin_id", profile.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from("admin_settings")
          .update({
            global_logo_url: globalLogoUrl,
            global_logo_alignment: globalLogoAlignment,
            global_logo_size: globalLogoSize,
          })
          .eq("admin_id", profile.id);

        if (error) {
          throw error;
        }
      } else {
        // Insert new record with required fields
        const { error } = await supabase
          .from("admin_settings")
          .insert({
            admin_id: profile.id,
            resend_api_key: '', // Required field, set to empty string
            global_logo_url: globalLogoUrl,
            global_logo_alignment: globalLogoAlignment,
            global_logo_size: globalLogoSize,
          });

        if (error) {
          throw error;
        }
      }

      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni del logo globale sono state salvate con successo.",
      });
    } catch (error: any) {
      console.error("Error saving global logo settings:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio delle impostazioni: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Logo Globale per Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-gray-600">
            <p>Configura un logo globale che verrà utilizzato in tutti i template email. Questo logo sostituirà le impostazioni individuali di ogni template.</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="logo-upload">Upload Logo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">Caricamento in corso...</p>}
            </div>

            {globalLogoUrl && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <Label className="text-sm font-medium">Anteprima Logo</Label>
                <div className="mt-2 flex flex-col items-center space-y-3">
                  <img 
                    src={globalLogoUrl} 
                    alt="Logo globale" 
                    className={`
                      ${globalLogoSize === 'small' ? 'max-h-10' : 
                        globalLogoSize === 'large' ? 'max-h-20' : 'max-h-15'} 
                      max-w-48 object-contain
                    `}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Rimuovi Logo
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="logo-alignment">Allineamento Logo</Label>
                <Select value={globalLogoAlignment} onValueChange={setGlobalLogoAlignment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona allineamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Sinistra</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Destra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="logo-size">Dimensione Logo</Label>
                <Select value={globalLogoSize} onValueChange={setGlobalLogoSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona dimensione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Piccolo</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Impostazioni Avanzate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Nota:</strong> Il logo globale verrà applicato a tutti i template email. Le impostazioni individuali del logo nei singoli template verranno ignorate.</p>
            </div>
            
            <Button 
              onClick={handleSaveSettings} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Salvataggio..." : "Salva Impostazioni Logo Globale"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalLogoSection;
