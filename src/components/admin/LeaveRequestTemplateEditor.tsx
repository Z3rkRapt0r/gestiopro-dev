
import EmailTemplateEditor from "./EmailTemplateEditor";

const LeaveRequestTemplateEditor = () => {
  const defaultContent = "Gentile Amministratore,\n\nMario Rossi ha inviato una nuova richiesta di permesso. Ti preghiamo di prenderne visione e procedere con l'approvazione o il rifiuto.\n\nDettagli della richiesta:\nTipo: Permesso\nGiorno: 18 Giugno 2025\nOrario: 14:00 - 16:00\nMotivo: Visita medica";
  const defaultSubject = "Nuova Richiesta Permesso";

  return (
    <EmailTemplateEditor
      templateType="permessi-richiesta"
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default LeaveRequestTemplateEditor;
