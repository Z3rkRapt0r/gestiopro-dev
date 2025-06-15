
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlignLeft, AlignRight, Image } from "lucide-react";

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
  const [logoAlign, setLogoAlign] = useState<"left" | "right">("left");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const inputLogoRef = useRef<HTMLInputElement>(null);

  // Carica i dati salvati (logo, footer, allineamento)
  useEffect(() => {
    const loadData = async () => {
      if (!profile?.id) {
        setInitialLoading(false);
        return;
      }
      setInitialLoading(true);

      // 1. Carica il logo
      const { data: logoData } = await supabase
        .storage
        .from(LOGO_BUCKET)
        .getPublicUrl(`${profile.id}/${LOGO_PATH}`);
      if (logoData?.publicUrl) {
        setLogoUrl(logoData.publicUrl);
      } else {
        setLogoUrl(null);
      }

      // 2. Carica le impostazioni template (allineamento logo e footer)
      const { data, error } = await supabase
        .from("email_templates")
        .select("subject,name")
        .eq("admin_id", profile.id)
        .eq("is_default", false)
        .eq("topic", "generale")
        .maybeSingle();

      if (!error && data) {
        setFooterText(data.subject || DEFAULT_FOOTER);
        setLogoAlign((data.name === "right" ? "right" : "left") as "left" | "right");
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

  // Salva solo allineamento logo e footer
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
    // salvo footerText in subject, align in name
    const { error } = await supabase.from("email_templates").upsert(
      [
        {
          admin_id: profile.id,
          name: logoAlign, // left o right
          subject: footerText,
          is_default: false,
          topic: "generale",
          content: "", // pulito, non usato qui
        },
      ],
      {
        onConflict: "admin_id,topic",
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

  // Anteprima HTML (non personalizzabile qui)
  const renderPreview = () => {
    return `
      <div style="font-family: sans-serif; border:1px solid #ccc; padding:32px; max-width:580px; margin:auto; background:white;">
        ${
          logoUrl
            ? `<div style="text-align:${logoAlign};margin-bottom:20px;"><img src="${logoUrl}" alt="logo" style="max-height:60px; max-width:180px;"/></div>`
            : ""
        }
        <div>
          <h2 style="color: #2757d6;">Oggetto comunicazione</h2>
          <p>${DEMO_BODY}</p>
        </div>
        <footer style="color:#888; font-size:13px; margin-top:36px;text-align:center;">${footerText}</footer>
      </div>
    `;
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
          <div className="w-full md:w-1/2 flex flex-col gap-1">
            <Label>Allineamento logo:</Label>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant={logoAlign === "left" ? "default" : "outline"}
                onClick={() => setLogoAlign("left")}
                type="button"
                title="Allinea a sinistra"
                disabled={loading || initialLoading}
              >
                <AlignLeft />
              </Button>
              <Button
                size="icon"
                variant={logoAlign === "right" ? "default" : "outline"}
                onClick={() => setLogoAlign("right")}
                type="button"
                title="Allinea a destra"
                disabled={loading || initialLoading}
              >
                <AlignRight />
              </Button>
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
