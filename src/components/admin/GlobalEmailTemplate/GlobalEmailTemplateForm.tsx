import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlobalEmailLogoUploader } from "./GlobalEmailLogoUploader";
import { GlobalEmailLogoAlign } from "./GlobalEmailLogoAlign";
import { GlobalEmailFooterInput } from "./GlobalEmailFooterInput";
import { GlobalEmailPreview } from "./GlobalEmailPreview";

const DEFAULT_FOOTER = "Questo messaggio è stato generato automaticamente.";
const DEFAULT_SENDER_NAME = "A.L.M Infissi";
const LOGO_BUCKET = "company-assets";
const LOGO_PATH = "email-logo.png";
const DEMO_BODY = "Qui verrà inserito il messaggio della comunicazione.";

export const GlobalEmailTemplateForm = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [footerText, setFooterText] = useState(DEFAULT_FOOTER);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const [logoAlign, setLogoAlign] = useState<"left" | "right" | "center">("left");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fisso, mai modificabile
  const senderName = DEFAULT_SENDER_NAME;

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.id) {
        setInitialLoading(false);
        return;
      }
      setInitialLoading(true);

      // Step 1: Ottieni il logo pubblicamente (aggiungi timestamp per bypass cache)
      const { data: logoData } = await supabase
        .storage.from(LOGO_BUCKET)
        .getPublicUrl(`${profile.id}/${LOGO_PATH}`);
      setLogoUrl(
        logoData?.publicUrl
          ? logoData.publicUrl + `?t=${Date.now()}`
          : null
      );

      // Step 2: Ottieni il template email personalizzato
      const { data, error } = await supabase
        .from("email_templates")
        .select("subject,name")
        .eq("admin_id", profile.id)
        .eq("is_default", false)
        .eq("topic", "generale")
        .maybeSingle();

      if (!error && data) {
        // Su caricamento, imposto quello che viene da Supabase (solo una volta)
        setFooterText(data.subject || DEFAULT_FOOTER);
        const alignValue =
          data.name === "right"
            ? "right"
            : data.name === "center"
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

  // Funzione per aggiornare solo se cambiato e NON sovrascrivere input utente
  const reloadTemplateSettings = async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from("email_templates")
      .select("subject,name")
      .eq("admin_id", profile.id)
      .eq("is_default", false)
      .eq("topic", "generale")
      .maybeSingle();

    if (!error && data) {
      // Solo aggiorna se diversi per non sovrascrivere input utente post-save
      if (data.subject !== footerText) setFooterText(data.subject || DEFAULT_FOOTER);
      const alignValue =
        data.name === "right"
          ? "right"
          : data.name === "center"
          ? "center"
          : "left";
      if (alignValue !== logoAlign)
        setLogoAlign(alignValue as "left" | "right" | "center");
    }
  };

  const handleLogoUpload = async () => {
    if (!logoUploadFile || !profile?.id) return;
    setLoading(true);
    await supabase.storage.createBucket(LOGO_BUCKET, { public: true }).catch(() => {});
    const path = `${profile.id}/${LOGO_PATH}`;

    await supabase.storage.from(LOGO_BUCKET).remove([path]).catch(() => {});

    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, logoUploadFile, {
        cacheControl: "0",
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
    setLogoUrl(logoData?.publicUrl ? logoData.publicUrl + `?t=${Date.now()}` : null);
    toast({
      title: "Logo aggiornato",
      description: "Il logo è stato caricato con successo.",
    });
    setLoading(false);
  };

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
      const { error: updateError } = await supabase
        .from("email_templates")
        .update({
          name: logoAlign,
          subject: footerText,
          sender_name: DEFAULT_SENDER_NAME,
          is_default: false,
          content: "",
        })
        .eq("id", existing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("email_templates")
        .insert([
          {
            admin_id: profile.id,
            name: logoAlign,
            subject: footerText,
            sender_name: DEFAULT_SENDER_NAME,
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
      // Ricarica il dato dal backend solo se effettivamente cambiato
      await reloadTemplateSettings();
    }
  };

  return (
    <div className="space-y-5">
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
      {/* Nome mittente fisso, non modificabile */}
      <div>
        <label className="block mb-1 font-medium" htmlFor="sender-name">Nome Mittente:</label>
        <Input
          id="sender-name"
          value={senderName}
          readOnly
          disabled
        />
        <div className="text-xs text-muted-foreground mt-1">
          Questo valore è fisso e non modificabile.
        </div>
      </div>
      <GlobalEmailFooterInput
        value={footerText}
        onChange={(val) => { setFooterText(val); }}
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
        DEMO_BODY={DEMO_BODY}
      />
    </div>
  );
};
