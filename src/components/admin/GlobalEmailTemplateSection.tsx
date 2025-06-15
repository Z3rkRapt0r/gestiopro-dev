
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const DEFAULT_TEMPLATE = `<div style="font-family: sans-serif; padding: 20px;">
  <h2 style="color: #2757d6">Titolo comunicazione</h2>
  <p>Testo principale della comunicazione qui...</p>
  <footer style="font-size: 12px; color: #888; margin-top: 32px;">
    Questo messaggio è stato generato automaticamente.
  </footer>
</div>`;

const GlobalEmailTemplateSection = () => {
  const [html, setHtml] = useState(DEFAULT_TEMPLATE);

  // Qui puoi integrare la logica di salvataggio su Supabase se richiesto

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
        />
        <div>
          <Label>Anteprima:</Label>
          <div
            className="border rounded p-4 mt-2 bg-white max-h-72 overflow-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        {/* Placeholder per bottone di salvataggio backend */}
        <Button disabled>Salva modello (in arrivo)</Button>
      </CardContent>
    </Card>
  );
};

export default GlobalEmailTemplateSection;
