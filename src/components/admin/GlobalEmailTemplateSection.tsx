import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlobalEmailLogoUploader } from "./GlobalEmailTemplate/GlobalEmailLogoUploader";
import { GlobalEmailLogoAlign } from "./GlobalEmailTemplate/GlobalEmailLogoAlign";
import { GlobalEmailFooterInput } from "./GlobalEmailTemplate/GlobalEmailFooterInput";
import { GlobalEmailPreview } from "./GlobalEmailTemplate/GlobalEmailPreview";

const DEFAULT_FOOTER = "Questo messaggio è stato generato automaticamente.";
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
  const [senderName, setSenderName] = useState("Admin SerramentiCorp - Sistema notifiche");

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.id) {
        setInitialLoading(false);
        return;
      }
      setInitialLoading(true);

      // Logo
      const { data: logoData } = await supabase
        .storage
        .from(LOGO_BUCKET)
        .getPublicUrl(`${profile.id}/${LOGO_PATH}`);
      setLogoUrl(logoData?.publicUrl || null);

      // Template
      const { data, error } = await supabase
        .from("email_templates")
        .select("subject,name,sender_name")
        .eq("admin_id", profile.id)
        .eq("is_default", false)
        .eq("topic", "generale")
        .maybeSingle();

      if (!error && data) {
        setFooterText(data.subject || DEFAULT_FOOTER);

        const alignValue =
          data.name === "right"
            ? "right"
            : data.name === "center"
            ? "center"
            : "left";
        setLogoAlign(alignValue as "left" | "right" | "center");
        // SOLO SE IL CAMPO È DEFINITO, ALTRIMENTI LASCIARE QUELLO ESISTENTE
        setSenderName(
          typeof data.sender_name === "string" && data.sender_name.length > 0
            ? data.sender_name
            : ""
        );
      } else {
        setFooterText(DEFAULT_FOOTER);
        setLogoAlign("left");
        setSenderName(""); // Lascia campo vuoto se nuovo
      }

      setInitialLoading(false);
    };
    loadData();
    // eslint-disable-next-line
  }, [profile?.id]);

  // Logo upload logic
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

  // Salva allineamento, footer e mittente
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

    const { data: existing, error: getError } = await supabase
      .from("email_templates")
      .select("id")
      .eq("admin_id", profile.id)
      .eq("topic", "generale")
      .maybeSingle();

    let error = null;

    if (existing?.id) {
      // Aggiornamento template esistente
      const { error: updateError } = await supabase
        .from("email_templates")
        .update({
          name: logoAlign,
          subject: footerText,
          sender_name: senderName, // <--- Qui mi assicuro che venga aggiornato!
          is_default: false,
          content: "",
        })
        .eq("id", existing.id);

      error = updateError;
    } else {
      // Creazione nuovo template
      const { error: insertError } = await supabase
        .from("email_templates")
        .insert([
          {
            admin_id: profile.id,
            name: logoAlign,
            subject: footerText,
            sender_name: senderName, // <--- Qui mi assicuro che venga inserito!
            is_default: false,
            topic: "generale",
            content: "",
          },
        ]);
      error = insertError;
    }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalizzazione Email Generali</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <GlobalEmailLogoUploader
            logoUrl={logoUrl}
            loading={loading}
            initialLoading={initialLoading}
            setLogoUploadFile={setLogoUploadFile}
            onLogoUpload={handleLogoUpload}
            logoUploadFile={logoUploadFile}
          />
          <GlobalEmailLogoAlign
            logoAlign={logoAlign}
            setLogoAlign={setLogoAlign}
            loading={loading}
            initialLoading={initialLoading}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium" htmlFor="sender-name">Nome Mittente:</label>
          <Input
            id="sender-name"
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            placeholder="Admin SerramentiCorp - Sistema notifiche"
            disabled={loading || initialLoading}
          />
          <div className="text-xs text-muted-foreground mt-1">
            Apparirà come nome mittente per l’invio delle email.
          </div>
        </div>
        <GlobalEmailFooterInput
          value={footerText}
          onChange={setFooterText}
          loading={loading}
          initialLoading={initialLoading}
        />
        <Button
          onClick={handleSave}
          disabled={loading || initialLoading}
        >
          {loading ? "Salvataggio..." : "Salva Modifiche"}
        </Button>
        <GlobalEmailPreview
          logoUrl={logoUrl}
          logoAlign={logoAlign}
          footerText={footerText}
          senderName={senderName}
          DEMO_BODY={DEMO_BODY}
        />
      </CardContent>
    </Card>
  );
};

export default GlobalEmailTemplateSection;
