import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlignLeft, AlignRight, AlignCenter, Image } from "lucide-react";

const DEFAULT_FOOTER = "© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820";

const LOGO_BUCKET = "company-assets";
const LOGO_PATH = "email-logo.png";

const DEMO_BODY = "Qui verrà inserito il messaggio della comunicazione.";

const GlobalEmailTemplateSection = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [footerText, setFooterText] = useState(DEFAULT_FOOTER);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const [logoAlign, setLogoAlign] = useState<"left" | "right" | "center">("left");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const inputLogoRef = useRef<HTMLInputElement>(null);

  // Se il logo allegato è presente, imposta direttamente come logoUploadFile ed esegui upload (funzione async corretta)
  useEffect(() => {
    const autoUploadLogoFromAttachment = async () => {
      if (!profile?.id) return;
      const { data: logoData } = await supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(`${profile.id}/${LOGO_PATH}`);
      if (logoData?.publicUrl) return; // già esiste un logo
      const response = await fetch("/lovable-uploads/6ef558b5-05c5-4f90-8b0e-d42cb12af8e8.png");
      const blob = await response.blob();
      const file = new File([blob], "email-logo.png", { type: blob.type });
      setLogoUploadFile(file);
      setLoading(true);
      await supabase.storage.createBucket(LOGO_BUCKET, { public: true }).catch(() => {});
      const path = `${profile.id}/${LOGO_PATH}`;
      await supabase.storage.from(LOGO_BUCKET).remove([path]).catch(() => {});
      const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });
      if (!error) {
        const { data: newLogoData } = await supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
        setLogoUrl(newLogoData?.publicUrl ?? null);
        toast({
          title: "Logo impostato",
          description: "Il nuovo logo aziendale è stato impostato automaticamente.",
        });
      }
      setLoading(false);
    };

    autoUploadLogoFromAttachment();
    // eslint-disable-next-line
  }, [profile?.id]);

  // Carica il logo e le impostazioni template usando il nuovo campo template_type
  useEffect(() => {
    const loadData = async () => {
      if (!profile?.id) {
        setInitialLoading(false);
        return;
      }
      setInitialLoading(true);

      const { data: logoData } = await supabase
        .storage
        .from(LOGO_BUCKET)
        .getPublicUrl(`${profile.id}/${LOGO_PATH}`);
      if (logoData?.publicUrl) {
        setLogoUrl(logoData.publicUrl);
      } else {
        setLogoUrl(null);
      }

      const { data, error } = await supabase
        .from("email_templates")
        .select("footer_text,logo_alignment")
        .eq("admin_id", profile.id)
        .eq("is_default", false)
        .eq("template_type", "generale")
        .maybeSingle();

      if (!error && data) {
        setFooterText(data.footer_text || DEFAULT_FOOTER);
        const alignValue =
          data.logo_alignment === "right"
            ? "right"
            : data.logo_alignment === "center"
            ? "center"
            : "left";
        setLogoAlign(alignValue as "left" | "right" | "center");
      } else {
        setFooterText(DEFAULT_FOOTER);
        setLogoAlign("left");
      }

      setInitialLoading(false);
    };

    loadData();
    // eslint-disable-next-line
  }, [profile?.id]);

  // Upload logo su Supabase Storage
  const handleLogoUpload = async () => {
    if (!logoUploadFile || !profile?.id) return;
    setLoading(true);
    await supabase.storage.createBucket(LOGO_BUCKET, { public: true }).catch(() => {});
    const path = `${profile.id}/${LOGO_PATH}`;
    await supabase.storage.from(LOGO_BUCKET).remove([path]).catch(() => {});
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, logoUploadFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: logoUploadFile.type,
      });
    if (error) {
      toast({
        title: "Errore upload logo",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    const { data: logoData } = await supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
    setLogoUrl(logoData?.publicUrl ?? null);
    toast({
      title: "Logo aggiornato",
      description: "Il logo è stato caricato con successo.",
    });
    setLoading(false);
  };

  // Salva solo allineamento logo e footer con la nuova struttura
  const handleSave = async () => {
    if (!profile?.id) {
      toast({
        title: "Errore",
        description: "Profilo amministratore non trovato.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    
    const { error } = await supabase.from("email_templates").upsert(
      [
        {
          admin_id: profile.id,
          name: "Template Globale",
          subject: "Email Generale",
          content: "",
          template_type: "generale",
          footer_text: footerText,
          logo_alignment: logoAlign,
          is_default: false,
        },
      ],
      {
        onConflict: "admin_id,template_type",
        ignoreDuplicates: false,
      }
    );
    setLoading(false);
    if (error) {
      toast({
        title: "Errore salvataggio",
        description: "Non è stato possibile salvare le impostazioni.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Salvato",
        description: "Le impostazioni sono state aggiornate.",
      });
    }
  };

  // Footer HTML blocco centrale, usato in buildHtmlContent e renderPreview
  const FOOTER_HTML = `<footer style="color:#888; font-size:13px; margin-top:36px; width:100%; text-align:center; display:block;">
    © A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820
  </footer>`;

  // Funzione per costruire HTML completo (MAIL TEST)
  const buildHtmlContent = () => {
    // Forza l'allineamento centrale solo per il logo nelle email spedite
    return `
      <div style="font-family: sans-serif; border:1px solid #ccc; padding:32px; max-width:580px; margin:auto; background:white;">
        ${
          logoUrl
            ? `<div style="text-align:center;margin-bottom:20px;"><img src="${logoUrl}" alt="logo" style="max-height:60px; max-width:180px;"/></div>`
            : ""
        }
        <div>
          <h2 style="color: #2757d6;">Oggetto comunicazione</h2>
          <p>${DEMO_BODY}</p>
        </div>
        ${FOOTER_HTML}
      </div>
    `;
  };

  // Anteprima HTML: ALLINEAMENTO CENTRALE FISSO (come nelle email)
  const renderPreview = () => {
    return `
      <div style="font-family: sans-serif; border:1px solid #ccc; padding:32px; max-width:580px; margin:auto; background:white;">
        ${
          logoUrl
            ? `<div style="text-align:center;margin-bottom:20px;"><img src="${logoUrl}" alt="logo" style="max-height:60px; max-width:180px;"/></div>`
            : ""
        }
        <div>
          <h2 style="color: #2757d6;">Oggetto comunicazione</h2>
          <p>${DEMO_BODY}</p>
        </div>
        ${FOOTER_HTML}
      </div>
    `;
  };

  // --- FUNZIONE INVIO MAIL DI TEST ---
  const handleSendTest = async () => {
    if (!testEmail || !profile?.id) {
      toast({
        title: "Email mancante",
        description: "Inserisci un indirizzo email valido per il test.",
        variant: "destructive",
      });
      return;
    }
    setTestLoading(true);
    // Composizione payload per la funzione edge
    const payload = {
      templateId: null, // indica che è un test generico/globale
      testEmail,
      userId: profile.id,
      subject: "Oggetto comunicazione",
      content: buildHtmlContent(),
    };
    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: payload,
      });
      if (error || data?.error) {
        toast({
          title: "Errore invio test",
          description: error?.message || data?.error || "Errore sconosciuto durante l'invio.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Test inviato",
          description: "Email di test inviata all'indirizzo specificato.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Errore invio",
        description: e.message || "Si è verificato un errore durante l'invio del test.",
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalizzazione Email Generali</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:w-1/2">
            <Label>Logo aziendale:</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => inputLogoRef.current?.click()}
                type="button"
                title="Carica logo"
                disabled={loading || initialLoading}
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
                disabled={loading || initialLoading}
              />
              <Button
                onClick={handleLogoUpload}
                variant="secondary"
                disabled={loading || initialLoading || !logoUploadFile}
                type="button"
              >
                Carica Logo
              </Button>
              {logoUrl && (
                <img src={logoUrl} alt="logo email" className="h-8 ml-2 rounded shadow" />
              )}
            </div>
          </div>
          {/* RIMUOVO/Disabilito pulsanti allineamento logo */}
          <div className="w-full md:w-1/2 flex flex-col gap-1">
            <Label>Allineamento logo:</Label>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" disabled type="button" title="Allineamento fisso centrale">
                <AlignLeft />
              </Button>
              <Button size="icon" variant="default" disabled type="button" title="Allineamento fisso centrale">
                <AlignCenter />
              </Button>
              <Button size="icon" variant="outline" disabled type="button" title="Allineamento fisso centrale">
                <AlignRight />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground pt-1">
              L'allineamento del logo è sempre <b>centrale</b> nelle email.
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="footer-template">Testo Footer Personalizzato:</Label>
          <Input
            id="footer-template"
            value={footerText}
            onChange={e => setFooterText(e.target.value)}
            disabled={loading || initialLoading}
          />
        </div>
        {/* --- Sezione nuova per invio TEST ----- */}
        <div className="flex flex-col gap-2 pt-1 pb-2">
          <Label htmlFor="test-email">Invia una mail di test:</Label>
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <Input
              id="test-email"
              type="email"
              placeholder="Inserisci indirizzo email destinatario"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              disabled={testLoading || initialLoading}
              className="sm:w-72"
            />
            <Button
              onClick={handleSendTest}
              disabled={testLoading || initialLoading || !testEmail}
              type="button"
              variant="secondary"
            >
              {testLoading ? "Invio in corso..." : "Invia test"}
            </Button>
          </div>
        </div>
        {/* --- Fine sezione test --- */}
        <Button
          onClick={handleSave}
          disabled={loading || initialLoading}
        >
          {loading ? "Salvataggio..." : "Salva Modifiche"}
        </Button>
        <div>
          <Label>Anteprima esempio:</Label>
          <div
            className="border rounded p-4 mt-2 bg-white max-h-[600px] overflow-auto"
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobalEmailTemplateSection;
