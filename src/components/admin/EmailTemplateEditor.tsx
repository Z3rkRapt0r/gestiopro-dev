import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Image } from "lucide-react";
import EmailTemplatePreview from "./EmailTemplatePreview";
import TestEmailDialog from "./TestEmailDialog";
import type { Database } from "@/integrations/supabase/types";

type EmailTemplate = Database['public']['Tables']['email_templates']['Row'] & {
  details?: string;
  show_details_button?: boolean;
  show_leave_details?: boolean;
};

type EmailTemplateInsert = Database['public']['Tables']['email_templates']['Insert'] & {
  details?: string;
  show_details_button?: boolean;
  show_leave_details?: boolean;
};

interface EmailTemplateEditorProps {
  templateType: 'documenti' | 'notifiche' | 'approvazioni' | 'generale' | 'permessi-richiesta' | 'permessi-approvazione' | 'permessi-rifiuto';
  defaultContent: string;
  defaultSubject: string;
}

const EmailTemplateEditor = ({ templateType, defaultContent, defaultSubject }: EmailTemplateEditorProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<Partial<EmailTemplate>>({
    name: `Template ${templateType}`,
    template_type: templateType,
    subject: defaultSubject,
    content: defaultContent,
    details: '',
    primary_color: '#007bff',
    secondary_color: '#6c757d',
    background_color: '#ffffff',
    text_color: '#333333',
    logo_alignment: 'center',
    logo_size: 'medium',
    footer_text: '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
    footer_color: '#888888',
    header_alignment: 'center',
    body_alignment: 'left',
    font_family: 'Arial, sans-serif',
    font_size: 'medium',
    button_color: '#007bff',
    button_text_color: '#ffffff',
    border_radius: '6px',
    show_details_button: true,
    show_leave_details: true
  });

  // Check if this is a leave-related template
  const isLeaveTemplate = ['permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto'].includes(templateType);

  useEffect(() => {
    loadTemplate();
  }, [profile?.id, templateType]);

  const loadTemplate = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('admin_id', profile.id)
        .eq('template_type', templateType)
        .maybeSingle();

      if (error) {
        console.error('Error loading template:', error);
        return;
      }

      if (data) {
        setTemplate(data);
      }
    } catch (error) {
      console.error('Error in loadTemplate:', error);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoUploadFile || !profile?.id) return;
    
    setLoading(true);
    const logoPath = `email-templates/${profile.id}/${templateType}/logo.${logoUploadFile.name.split('.').pop()}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(logoPath, logoUploadFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: logoUploadFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: logoData } = await supabase.storage
        .from('company-assets')
        .getPublicUrl(logoPath);

      setTemplate(prev => ({ ...prev, logo_url: logoData?.publicUrl || '' }));
      
      toast({
        title: "Logo caricato",
        description: "Il logo è stato caricato con successo.",
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nel caricamento del logo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const templateData: EmailTemplateInsert = {
        ...template,
        admin_id: profile.id,
        updated_at: new Date().toISOString()
      } as EmailTemplateInsert;

      const { error } = await supabase
        .from('email_templates')
        .upsert(templateData, {
          onConflict: 'admin_id,template_type',
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Template salvato",
        description: "Il modello email è stato salvato con successo.",
      });
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nel salvataggio del template.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = (field: keyof EmailTemplate, value: any) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Configurazione Template</CardTitle>
            <TestEmailDialog
              templateType={templateType}
              subject={template.subject || ''}
              content={template.content || ''}
              disabled={loading}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sezione Contenuto Email - Solo per template P/F */}
          {isLeaveTemplate && (
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
              <h3 className="font-semibold text-lg">Contenuto Email</h3>
              
              <div>
                <Label htmlFor="subject">Oggetto Email</Label>
                <Input
                  id="subject"
                  value={template.subject || ''}
                  onChange={(e) => updateTemplate('subject', e.target.value)}
                  placeholder="Oggetto dell'email"
                />
              </div>

              <div>
                <Label htmlFor="content">Contenuto Email</Label>
                <textarea
                  id="content"
                  value={template.content || ''}
                  onChange={(e) => updateTemplate('content', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  placeholder="Contenuto principale dell'email"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Usa "Mario Rossi" come placeholder per il nome del dipendente - verrà sostituito automaticamente.
                </p>
              </div>

              <div>
                <Label htmlFor="details">Dettagli Permesso/Ferie</Label>
                <textarea
                  id="details"
                  value={template.details || ''}
                  onChange={(e) => updateTemplate('details', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  placeholder="Dettagli:&#10;Tipo: Permesso&#10;Giorno: 18 Giugno 2025&#10;Orario: 14:00 - 16:00&#10;Motivo: Visita medica"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Questi dettagli verranno sostituiti con i dati reali della richiesta.
                </p>
              </div>

              {/* Sezione Controlli Visibilità */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium">Controlli Visibilità</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="show_details_button">Mostra Pulsante Dettagli</Label>
                    <p className="text-sm text-gray-500">Visualizza il pulsante per accedere ai dettagli</p>
                  </div>
                  <Switch
                    id="show_details_button"
                    checked={template.show_details_button ?? true}
                    onCheckedChange={(checked) => updateTemplate('show_details_button', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="show_leave_details">Mostra Dettagli Permesso</Label>
                    <p className="text-sm text-gray-500">Visualizza i dettagli del permesso/ferie nell'email</p>
                  </div>
                  <Switch
                    id="show_leave_details"
                    checked={template.show_leave_details ?? true}
                    onCheckedChange={(checked) => updateTemplate('show_leave_details', checked)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_color">Colore Primario</Label>
              <Input
                id="primary_color"
                type="color"
                value={template.primary_color || '#007bff'}
                onChange={(e) => updateTemplate('primary_color', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="secondary_color">Colore Secondario</Label>
              <Input
                id="secondary_color"
                type="color"
                value={template.secondary_color || '#6c757d'}
                onChange={(e) => updateTemplate('secondary_color', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="background_color">Colore Sfondo</Label>
              <Input
                id="background_color"
                type="color"
                value={template.background_color || '#ffffff'}
                onChange={(e) => updateTemplate('background_color', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="text_color">Colore Testo</Label>
              <Input
                id="text_color"
                type="color"
                value={template.text_color || '#333333'}
                onChange={(e) => updateTemplate('text_color', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Logo Template</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => inputLogoRef.current?.click()}
                type="button"
                title="Carica logo"
                disabled={loading}
              >
                <Image />
              </Button>
              <input
                ref={inputLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) setLogoUploadFile(e.target.files[0]);
                }}
                disabled={loading}
              />
              <Button
                onClick={handleLogoUpload}
                variant="secondary"
                disabled={loading || !logoUploadFile}
                type="button"
              >
                Carica Logo
              </Button>
              {template.logo_url && (
                <img src={template.logo_url} alt="logo template" className="h-8 ml-2 rounded shadow" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="logo_alignment">Allineamento Logo</Label>
              <Select value={template.logo_alignment || 'center'} onValueChange={(value) => updateTemplate('logo_alignment', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Sinistra</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Destra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="logo_size">Dimensione Logo</Label>
              <Select value={template.logo_size || 'medium'} onValueChange={(value) => updateTemplate('logo_size', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Piccolo</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="footer_text">Testo Footer</Label>
            <textarea
              id="footer_text"
              value={template.footer_text || ''}
              onChange={(e) => updateTemplate('footer_text', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="button_color">Colore Pulsanti</Label>
              <Input
                id="button_color"
                type="color"
                value={template.button_color || '#007bff'}
                onChange={(e) => updateTemplate('button_color', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="button_text_color">Colore Testo Pulsanti</Label>
              <Input
                id="button_text_color"
                type="color"
                value={template.button_text_color || '#ffffff'}
                onChange={(e) => updateTemplate('button_text_color', e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salva Template"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anteprima</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailTemplatePreview template={template as any} />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplateEditor;
