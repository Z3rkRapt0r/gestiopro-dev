
import EmailTemplateEditor from "./EmailTemplateEditor";

const LeaveRequestTemplateEditor = () => {
  const defaultContent = "Hai ricevuto una nuova richiesta di permesso/ferie da parte di un dipendente. Accedi alla dashboard per visualizzare i dettagli e procedere con l'approvazione o il rifiuto.";
  const defaultSubject = "Nuova Richiesta Permesso/Ferie";

  return (
    <EmailTemplateEditor
      templateType="permessi-richiesta"
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default LeaveRequestTemplateEditor;
