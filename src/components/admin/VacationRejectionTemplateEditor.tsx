
import EmailTemplateEditor from "./EmailTemplateEditor";

interface VacationRejectionTemplateEditorProps {
  templateCategory: string;
}

const VacationRejectionTemplateEditor = ({ templateCategory }: VacationRejectionTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType="ferie-rifiuto"
      templateCategory={templateCategory}
      defaultContent="Gentile {employee_name},\n\nLa tua richiesta di ferie è stata rifiutata.\n\nDettagli della richiesta:\n{leave_details}\n\nPer maggiori informazioni, contatta l'amministrazione."
      defaultSubject="Richiesta Ferie Rifiutata"
      subjectEditable={true}
      contentEditable={true}
    />
  );
};

export default VacationRejectionTemplateEditor;
