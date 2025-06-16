
import EmailTemplateEditor from "./EmailTemplateEditor";

const ApprovalTemplateEditor = () => {
  const defaultContent = "È necessaria la tua approvazione per una richiesta. Accedi alla dashboard per visualizzare i dettagli e procedere con l'approvazione o il rifiuto.";
  const defaultSubject = "Richiesta di Approvazione";

  return (
    <EmailTemplateEditor
      templateType="approvazioni"
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default ApprovalTemplateEditor;
