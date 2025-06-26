
import EmailTemplateEditor from "./EmailTemplateEditor";

const LeaveRejectionTemplateEditor = () => {
  const defaultContent = "Gentile Mario Rossi,\n\nLa tua richiesta di permesso è stata rifiutata dall'amministratore.\n\nDettagli:\nTipo: Permesso\nGiorno: 18 Giugno 2025\nOrario: 14:00 - 16:00\nMotivo: Visita medica\n\nNote amministratore: Impossibile concedere il permesso per esigenze di servizio. Riprova per un'altra data.";
  const defaultSubject = "Richiesta Rifiutata";

  return (
    <EmailTemplateEditor
      templateType="permessi-rifiuto"
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default LeaveRejectionTemplateEditor;
