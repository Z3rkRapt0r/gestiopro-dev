
import EmailTemplateEditor from "./EmailTemplateEditor";

const LeaveApprovalTemplateEditor = () => {
  const defaultContent = "La tua richiesta di permesso/ferie è stata approvata. Puoi consultare i dettagli nella tua dashboard personale.";
  const defaultSubject = "Richiesta Approvata";

  return (
    <EmailTemplateEditor
      templateType="permessi-approvazione"
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default LeaveApprovalTemplateEditor;
