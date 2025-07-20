
import EmailTemplateEditor from "./EmailTemplateEditor";

interface LeaveRejectionTemplateEditorProps {
  templateCategory?: string;
}

const LeaveRejectionTemplateEditor = ({ 
  templateCategory = "amministratori"
}: LeaveRejectionTemplateEditorProps) => {
  const defaultContent = "Gentile {employee_name},\n\nLa tua richiesta di permesso è stata rifiutata dall'amministratore.\n\nDettagli della richiesta:\n{leave_details}\n\nNote amministratore:\n{admin_note}\n\nPer maggiori informazioni, contatta l'amministrazione.";
  const defaultSubject = "Richiesta Permesso Rifiutata";

  return (
    <EmailTemplateEditor
      templateType="permessi-rifiuto"
      templateCategory={templateCategory}
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
      subjectEditable={true}
      contentEditable={true}
    />
  );
};

export default LeaveRejectionTemplateEditor;
