import { Label } from "@/components/ui/label";
import React from "react";

interface Props {
  logoUrl: string | null;
  logoAlign: "left" | "center" | "right";
  footerText: string;
  senderName?: string;
  DEMO_BODY?: string;
}

export const GlobalEmailPreview: React.FC<Props> = ({
  logoUrl,
  logoAlign,
  footerText,
  DEMO_BODY = "Qui verrà inserito il messaggio della comunicazione.",
}) => {
  let textAlign = logoAlign;
  if (logoAlign === "center") textAlign = "center";
  else if (logoAlign === "right") textAlign = "right";
  else textAlign = "left";
  const html = `
    <div style="font-family: sans-serif; border:1px solid #ccc; padding:32px; max-width:580px; margin:auto; background:white;">
      ${
        logoUrl
          ? `<div style="text-align:${textAlign};margin-bottom:20px;"><img src="${logoUrl}" alt="logo" style="max-height:60px; max-width:180px;"/></div>`
          : ""
      }
      <div>
        <h2 style="color: #2757d6;">Oggetto comunicazione</h2>
        <p>${DEMO_BODY}</p>
      </div>
      <footer style="color:#888; font-size:13px; margin-top:36px;text-align:center;">
        ${footerText}
      </footer>
    </div>
  `;
  return (
    <div>
      <Label>Anteprima esempio:</Label>
      <div
        className="border rounded p-4 mt-2 bg-white max-h-[600px] overflow-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
