
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_TEMPLATE = `<div style="font-family: sans-serif; padding: 20px;">
  <h2 style="color: #2757d6">Titolo comunicazione</h2>
  <p>Testo principale della comunicazione qui...</p>
  <footer style="font-size: 12px; color: #888; margin-top: 32px;">
    Questo messaggio è stato generato automaticamente.
  </footer>
</div>`;

const GlobalEmailTemplateSection = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [html, setHtml] = useState(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Carica il template globale dall'API Supabase
  useEffect(() => {
    const fetchGlobalTemplate = async () => {
      if (!profile?.id) {
        setInitialLoading(false);
        return;
      }
      setInitialLoading(true);
      const { data, error } = await supabase
        .from("email_templates")
        .select("content")
        .eq("admin_id", profile.id)
        .eq("is_default", true)
        .eq("topic", "globale")
        .maybeSingle();
      if (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare il modello globale.",
          variant: "destructive",
        });
        setInitialLoading(false);
        return;
      }
      if (data?.content) {
        setHtml(data.content);
      }
      setInitialLoading(false);
    };
    fetchGlobalTemplate();
    // eslint-disable-next-line
  }, [profile?.id]);

  // Salva il modello su Supabase
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
          name: "Modello Globale",
          subject: "",
          content: html,
          is_default: true,
          topic: "globale",
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
        description: "Non è stato possibile salvare il modello.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Salvato",
        description: "Il modello globale è stato aggiornato.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modello Globale Comunicazione Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label htmlFor="html-template">HTML del modello</Label>
        <Textarea
          id="html-template"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          className="font-mono"
          disabled={initialLoading || loading}
        />
        <div>
          <Label>Anteprima:</Label>
          <div
            className="border rounded p-4 mt-2 bg-white max-h-72 overflow-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || initialLoading}
        >
          {loading ? "Salvataggio..." : "Salva modello"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GlobalEmailTemplateSection;

