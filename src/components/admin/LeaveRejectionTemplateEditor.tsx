
import EmailTemplateEditor from "./EmailTemplateEditor";

const LeaveRejectionTemplateEditor = () => {
  const defaultContent = "La tua richiesta di permesso/ferie è stata rifiutata. Controlla le note dell'amministratore per maggiori dettagli.";
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
