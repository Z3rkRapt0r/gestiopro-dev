
import EmailTemplateEditor from "./EmailTemplateEditor";

interface PermissionRejectionTemplateEditorProps {
  templateCategory: string;
}

const PermissionRejectionTemplateEditor = ({ templateCategory }: PermissionRejectionTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType="permessi-rifiuto"
      templateCategory={templateCategory}
      defaultContent="Gentile {employee_name},\n\nLa tua richiesta di permesso è stata rifiutata.\n\nDettagli della richiesta:\n{leave_details}\n\nPer maggiori informazioni, contatta l'amministrazione."
      defaultSubject="Richiesta Permesso Rifiutata"
      subjectEditable={true}
      contentEditable={true}
    />
  );
};

export default PermissionRejectionTemplateEditor;
