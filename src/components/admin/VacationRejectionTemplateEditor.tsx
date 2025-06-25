
import EmailTemplateEditor from "./EmailTemplateEditor";

interface VacationRejectionTemplateEditorProps {
  templateCategory: string;
}

const VacationRejectionTemplateEditor = ({ templateCategory }: VacationRejectionTemplateEditorProps) => {
  const defaultContent = "Gentile {employee_name},\n\nLa tua richiesta di ferie è stata rifiutata dall'amministratore.\n\nDettagli della richiesta:\n{leave_details}\n\nNote amministratore:\n{admin_note}\n\nPer maggiori informazioni, contatta l'amministrazione.";
  const defaultSubject = "Richiesta Ferie Rifiutata";

  return (
    <EmailTemplateEditor
      templateType="ferie-rifiuto"
      templateCategory={templateCategory}
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
      subjectEditable={true}
      contentEditable={true}
    />
  );
};

export default VacationRejectionTemplateEditor;
