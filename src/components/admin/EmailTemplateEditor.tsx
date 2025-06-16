
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image } from "lucide-react";
import EmailTemplatePreview from "./EmailTemplatePreview";

interface EmailTemplate {
  id?: string;
  name?: string; // Added the missing name property
  template_type: 'documenti' | 'notifiche' | 'approvazioni';
  subject: string;
  content: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  logo_url?: string;
  logo_alignment: 'left' | 'center' | 'right';
  logo_size: 'small' | 'medium' | 'large';
  footer_text: string;
  footer_color: string;
  header_alignment: 'left' | 'center' | 'right';
  body_alignment: 'left' | 'center' | 'right' | 'justify';
  font_family: string;
  font_size: 'small' | 'medium' | 'large';
  button_color: string;
  button_text_color: string;
  border_radius: string;
}

interface EmailTemplateEditorProps {
  templateType: 'documenti' | 'notifiche' | 'approvazioni';
  defaultContent: string;
  defaultSubject: string;
}

const EmailTemplateEditor = ({ templateType, defaultContent, defaultSubject }: EmailTemplateEditorProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<EmailTemplate>({
    template_type: templateType,
    subject: defaultSubject,
    content: defaultContent,
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
    border_radius: '6px'
  });

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
        // Mappiamo i valori dal database ai tipi TypeScript corretti
        const templateData: EmailTemplate = {
          id: data.id,
          name: data.name,
          template_type: data.template_type as 'documenti' | 'notifiche' | 'approvazioni',
          subject: data.subject,
          content: data.content,
          primary_color: data.primary_color || '#007bff',
          secondary_color: data.secondary_color || '#6c757d',
          background_color: data.background_color || '#ffffff',
          text_color: data.text_color || '#333333',
          logo_url: data.logo_url || undefined,
          logo_alignment: (data.logo_alignment as 'left' | 'center' | 'right') || 'center',
          logo_size: (data.logo_size as 'small' | 'medium' | 'large') || 'medium',
          footer_text: data.footer_text || '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
          footer_color: data.footer_color || '#888888',
          header_alignment: (data.header_alignment as 'left' | 'center' | 'right') || 'center',
          body_alignment: (data.body_alignment as 'left' | 'center' | 'right' | 'justify') || 'left',
          font_family: data.font_family || 'Arial, sans-serif',
          font_size: (data.font_size as 'small' | 'medium' | 'large') || 'medium',
          button_color: data.button_color || '#007bff',
          button_text_color: data.button_text_color || '#ffffff',
          border_radius: data.border_radius || '6px'
        };
        setTemplate(templateData);
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
      const templateData = {
        ...template,
        name: `Template ${templateType}`, // Aggiungiamo il campo name richiesto
        admin_id: profile.id,
        updated_at: new Date().toISOString()
      };

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
          <CardTitle>Configurazione Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="content">Contenuto</Label>
            <Textarea
              id="content"
              value={template.content}
              onChange={(e) => updateTemplate('content', e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_color">Colore Primario</Label>
              <Input
                id="primary_color"
                type="color"
                value={template.primary_color}
                onChange={(e) => updateTemplate('primary_color', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="secondary_color">Colore Secondario</Label>
              <Input
                id="secondary_color"
                type="color"
                value={template.secondary_color}
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
                value={template.background_color}
                onChange={(e) => updateTemplate('background_color', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="text_color">Colore Testo</Label>
              <Input
                id="text_color"
                type="color"
                value={template.text_color}
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
              <Select value={template.logo_alignment} onValueChange={(value) => updateTemplate('logo_alignment', value)}>
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
              <Select value={template.logo_size} onValueChange={(value) => updateTemplate('logo_size', value)}>
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
            <Textarea
              id="footer_text"
              value={template.footer_text}
              onChange={(e) => updateTemplate('footer_text', e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="button_color">Colore Pulsanti</Label>
              <Input
                id="button_color"
                type="color"
                value={template.button_color}
                onChange={(e) => updateTemplate('button_color', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="button_text_color">Colore Testo Pulsanti</Label>
              <Input
                id="button_text_color"
                type="color"
                value={template.button_text_color}
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
          <EmailTemplatePreview template={template} />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplateEditor;
