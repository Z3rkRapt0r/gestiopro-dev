
import EmailTemplateEditor from "./EmailTemplateEditor";

interface PermissionApprovalTemplateEditorProps {
  templateCategory: string;
}

const PermissionApprovalTemplateEditor = ({ templateCategory }: PermissionApprovalTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType="permessi-approvazione"
      templateCategory={templateCategory}
      defaultContent="Gentile {employee_name},\n\nLa tua richiesta di permesso è stata approvata.\n\nDettagli della richiesta:\n{leave_details}\n\nBuona giornata!"
      defaultSubject="Richiesta Permesso Approvata"
      subjectEditable={true}
      contentEditable={true}
    />
  );
};

export default PermissionApprovalTemplateEditor;
