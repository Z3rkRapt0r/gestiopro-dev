import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Save, Settings, Type, Palette } from "lucide-react";
import TestEmailDialog from "./TestEmailDialog";

interface EmailTemplateEditorProps {
  templateType: string;
  templateCategory?: string;
  defaultContent: string;
  defaultSubject: string;
  subjectEditable?: boolean;
  contentEditable?: boolean;
}

const EmailTemplateEditor = ({ 
  templateType, 
  templateCategory = "generale",
  defaultContent, 
  defaultSubject,
  subjectEditable = true,
  contentEditable = true
}: EmailTemplateEditorProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Template content
  const [subject, setSubject] = useState(defaultSubject);
  const [content, setContent] = useState(defaultContent);
  const [textAlignment, setTextAlignment] = useState("left");
  
  // Design settings
  const [primaryColor, setPrimaryColor] = useState("#007bff");
  const [secondaryColor, setSecondaryColor] = useState("#6c757d");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#333333");
  const [fontFamily, setFontFamily] = useState("Arial, sans-serif");
  const [fontSize, setFontSize] = useState("medium");
  const [borderRadius, setBorderRadius] = useState("6px");
  
  // Footer and branding
  const [footerText, setFooterText] = useState("© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820");
  const [footerColor, setFooterColor] = useState("#888888");
  
  // Feature toggles
  const [showDetailsButton, setShowDetailsButton] = useState(true);
  const [showLeaveDetails, setShowLeaveDetails] = useState(true);
  const [showAdminNotes, setShowAdminNotes] = useState(true);
  const [showCustomBlock, setShowCustomBlock] = useState(false);
  
  // Custom block
  const [customBlockText, setCustomBlockText] = useState("");
  const [customBlockBgColor, setCustomBlockBgColor] = useState("#fff3cd");
  const [customBlockTextColor, setCustomBlockTextColor] = useState("#856404");
  
  // Leave details styling
  const [leaveDetailsBgColor, setLeaveDetailsBgColor] = useState("#e3f2fd");
  const [leaveDetailsTextColor, setLeaveDetailsTextColor] = useState("#1565c0");
  const [adminNotesBgColor, setAdminNotesBgColor] = useState("#f8f9fa");
  const [adminNotesTextColor, setAdminNotesTextColor] = useState("#495057");
  
  // Button styling
  const [buttonColor, setButtonColor] = useState("#007bff");
  const [buttonTextColor, setButtonTextColor] = useState("#ffffff");
  
  // State
  const [loading, setLoading] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);

  // New state for admin message section
  const [showAdminMessage, setShowAdminMessage] = useState(false);
  const [adminMessageBgColor, setAdminMessageBgColor] = useState("#e3f2fd");
  const [adminMessageTextColor, setAdminMessageTextColor] = useState("#1565c0");
  
  // Helper functions to determine template characteristics
  const isEmployeeRequestTemplate = () => {
    return templateCategory === 'dipendenti' && (templateType.includes('richiesta') || templateType === 'documenti');
  };

  const isAdminResponseTemplate = () => {
    return templateCategory === 'amministratori' && (templateType.includes('approvazione') || templateType.includes('rifiuto'));
  };

  const isLeaveTemplate = () => {
    return templateType.includes('permessi') || templateType.includes('ferie');
  };

  // NEW: Check if this is admin-to-employee document template
  const isAdminDocumentTemplate = () => {
    return templateType === 'documenti' && templateCategory === 'amministratori';
  };

  // Load existing template
  useEffect(() => {
    if (profile?.id) {
      loadTemplate();
    }
  }, [profile?.id, templateType, templateCategory]);

  const loadTemplate = async () => {
    try {
      console.log('Loading template:', { templateType, templateCategory, adminId: profile?.id });
      
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("admin_id", profile?.id)
        .eq("template_type", templateType)
        .eq("template_category", templateCategory)
        .maybeSingle();

      if (error) {
        console.error("Error loading template:", error);
        return;
      }

      if (data) {
        console.log('Template loaded successfully:', data);
        setExistingTemplateId(data.id);
        setSubject(data.subject || defaultSubject);
        setContent(data.content || defaultContent);
        setTextAlignment(data.text_alignment || "left");
        setPrimaryColor(data.primary_color || "#007bff");
        setSecondaryColor(data.secondary_color || "#6c757d");
        setBackgroundColor(data.background_color || "#ffffff");
        setTextColor(data.text_color || "#333333");
        setFontFamily(data.font_family || "Arial, sans-serif");
        setFontSize(data.font_size || "medium");
        setBorderRadius(data.border_radius || "6px");
        setFooterText(data.footer_text || "© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820");
        setFooterColor(data.footer_color || "#888888");
        setShowDetailsButton(data.show_details_button ?? true);
        setShowLeaveDetails(data.show_leave_details ?? true);
        setShowAdminNotes(data.show_admin_notes ?? true);
        setShowCustomBlock(data.show_custom_block || false);
        setCustomBlockText(data.custom_block_text || "");
        setCustomBlockBgColor(data.custom_block_bg_color || "#fff3cd");
        setCustomBlockTextColor(data.custom_block_text_color || "#856404");
        setLeaveDetailsBgColor(data.leave_details_bg_color || "#e3f2fd");
        setLeaveDetailsTextColor(data.leave_details_text_color || "#1565c0");
        setAdminNotesBgColor(data.admin_notes_bg_color || "#f8f9fa");
        setAdminNotesTextColor(data.admin_notes_text_color || "#495057");
        setButtonColor(data.button_color || "#007bff");
        setButtonTextColor(data.button_text_color || "#ffffff");
        // NEW: Load admin message settings
        setShowAdminMessage(data.show_admin_message || false);
        setAdminMessageBgColor(data.admin_message_bg_color || "#e3f2fd");
        setAdminMessageTextColor(data.admin_message_text_color || "#1565c0");
      } else {
        console.log('No existing template found, using defaults');
        setExistingTemplateId(null);
      }
    } catch (error) {
      console.error("Error loading template:", error);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per salvare i template.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Starting save process for template:', { templateType, templateCategory, existingTemplateId });

      const templateData = {
        admin_id: profile.id,
        template_type: templateType,
        template_category: templateCategory,
        name: `${templateType} - ${templateCategory}`,
        subject,
        content,
        text_alignment: textAlignment,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
        text_color: textColor,
        font_family: fontFamily,
        font_size: fontSize,
        border_radius: borderRadius,
        footer_text: footerText,
        footer_color: footerColor,
        show_details_button: showDetailsButton,
        show_leave_details: showLeaveDetails,
        show_admin_notes: showAdminNotes,
        show_custom_block: showCustomBlock,
        custom_block_text: customBlockText,
        custom_block_bg_color: customBlockBgColor,
        custom_block_text_color: customBlockTextColor,
        leave_details_bg_color: leaveDetailsBgColor,
        leave_details_text_color: leaveDetailsTextColor,
        admin_notes_bg_color: adminNotesBgColor,
        admin_notes_text_color: adminNotesTextColor,
        button_color: buttonColor,
        button_text_color: buttonTextColor,
        subject_editable: subjectEditable,
        content_editable: contentEditable,
        // NEW: Save admin message settings
        show_admin_message: showAdminMessage,
        admin_message_bg_color: adminMessageBgColor,
        admin_message_text_color: adminMessageTextColor,
      };

      if (existingTemplateId) {
        console.log('Deleting existing template:', existingTemplateId);
        const { error: deleteError } = await supabase
          .from("email_templates")
          .delete()
          .eq("id", existingTemplateId);

        if (deleteError) {
          console.error("Error deleting existing template:", deleteError);
          throw deleteError;
        }
      }

      console.log('Inserting new template:', templateData);
      const { data: newTemplate, error: insertError } = await supabase
        .from("email_templates")
        .insert(templateData)
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting template:", insertError);
        throw insertError;
      }

      console.log('Template saved successfully:', newTemplate);
      setExistingTemplateId(newTemplate.id);

      toast({
        title: "Template salvato",
        description: "Il template email è stato salvato con successo.",
      });
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio del template: " + (error.message || "Errore sconosciuto"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Editor Template Email</h3>
          <p className="text-sm text-gray-600">
            Categoria: {templateCategory === 'dipendenti' ? 'Per Dipendenti' : 'Per Amministratori'} | 
            Tipo: {templateType}
          </p>
        </div>
        <div className="flex gap-2">
          <TestEmailDialog
            templateType={templateType as any}
            templateCategory={templateCategory}
            subject={subject}
            content={content}
            disabled={loading}
          />
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Salvataggio..." : "Salva Template"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Content Section - Sempre visibile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Contenuto Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Oggetto Email</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Oggetto dell'email"
                disabled={!subjectEditable}
                className={!subjectEditable ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <p className="text-xs text-gray-500 mt-1">
                Puoi usare <code>{'{employee_name}'}</code> per inserire il nome del dipendente
              </p>
            </div>

            <div>
              <Label htmlFor="content">Contenuto Email</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Contenuto dell'email"
                rows={8}
                disabled={!contentEditable}
                className={!contentEditable ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              {isEmployeeRequestTemplate() && (
                <p className="text-xs text-gray-500 mt-1">
                  Puoi usare <code>{'{employee_note}'}</code> per le note del dipendente
                </p>
              )}
              {isLeaveTemplate() && (
                <p className="text-xs text-gray-500 mt-1">
                  Puoi usare <code>{'{leave_details}'}</code> per i dettagli della richiesta
                </p>
              )}
              {isAdminResponseTemplate() && (
                <p className="text-xs text-gray-500 mt-1">
                  Puoi usare <code>{'{admin_note}'}</code> per le note dell'amministratore
                </p>
              )}
              {/* NEW: Admin message variable help */}
              {isAdminDocumentTemplate() && (
                <p className="text-xs text-gray-500 mt-1">
                  Puoi usare <code>{'{admin_message}'}</code> per il messaggio dell'amministratore
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="text-alignment">Allineamento Testo</Label>
              <Select value={textAlignment} onValueChange={setTextAlignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona allineamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Sinistra</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Destra</SelectItem>
                  <SelectItem value="justify">Giustificato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Design Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Design e Colori
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary-color">Colore Primario</Label>
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="secondary-color">Colore Secondario</Label>
                <Input
                  id="secondary-color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="background-color">Colore Sfondo</Label>
                <Input
                  id="background-color"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="text-color">Colore Testo</Label>
                <Input
                  id="text-color"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="font-family">Font</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="font-size">Dimensione Font</Label>
              <Select value={fontSize} onValueChange={setFontSize}>
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
          </CardContent>
        </Card>

        {/* Footer Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Footer e Impostazioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="footer-text">Testo Footer</Label>
              <Textarea
                id="footer-text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Testo del footer"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="footer-color">Colore Footer</Label>
              <Input
                id="footer-color"
                type="color"
                value={footerColor}
                onChange={(e) => setFooterColor(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Mostra Pulsante Dettagli</Label>
                <Switch
                  checked={showDetailsButton}
                  onCheckedChange={setShowDetailsButton}
                />
              </div>

              {isLeaveTemplate() && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Mostra Dettagli Permessi/Ferie</Label>
                    <Switch
                      checked={showLeaveDetails}
                      onCheckedChange={setShowLeaveDetails}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>
                      {isEmployeeRequestTemplate() ? 'Mostra Note Dipendente' : 'Mostra Note Admin'}
                    </Label>
                    <Switch
                      checked={showAdminNotes}
                      onCheckedChange={setShowAdminNotes}
                    />
                  </div>
                </>
              )}

              {/* NEW: Admin Message Section - ONLY for admin document templates */}
              {isAdminDocumentTemplate() && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Mostra Messaggio Amministratore</Label>
                    <Switch
                      checked={showAdminMessage}
                      onCheckedChange={setShowAdminMessage}
                    />
                  </div>

                  {showAdminMessage && (
                    <div className="space-y-2 mt-2 pl-4 border-l-2 border-blue-200">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="admin-message-bg-color" className="text-xs">Colore Sfondo Messaggio</Label>
                          <Input
                            id="admin-message-bg-color"
                            type="color"
                            value={adminMessageBgColor}
                            onChange={(e) => setAdminMessageBgColor(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label htmlFor="admin-message-text-color" className="text-xs">Colore Testo Messaggio</Label>
                          <Input
                            id="admin-message-text-color"
                            type="color"
                            value={adminMessageTextColor}
                            onChange={(e) => setAdminMessageTextColor(e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Il messaggio dell'amministratore apparirà in questa sezione quando presente
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between">
                <Label>Mostra Blocco Personalizzato</Label>
                <Switch
                  checked={showCustomBlock}
                  onCheckedChange={setShowCustomBlock}
                />
              </div>

              {showCustomBlock && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="custom-block-text">Testo Blocco Personalizzato</Label>
                  <Textarea
                    id="custom-block-text"
                    value={customBlockText}
                    onChange={(e) => setCustomBlockText(e.target.value)}
                    placeholder="Testo del blocco personalizzato"
                    rows={3}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Button Styling */}
        <Card>
          <CardHeader>
            <CardTitle>Stile Pulsanti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="button-color">Colore Pulsante</Label>
                <Input
                  id="button-color"
                  type="color"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="button-text-color">Colore Testo Pulsante</Label>
                <Input
                  id="button-text-color"
                  type="color"
                  value={buttonTextColor}
                  onChange={(e) => setButtonTextColor(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="border-radius">Raggio Bordi</Label>
              <Input
                id="border-radius"
                value={borderRadius}
                onChange={(e) => setBorderRadius(e.target.value)}
                placeholder="es. 6px"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
