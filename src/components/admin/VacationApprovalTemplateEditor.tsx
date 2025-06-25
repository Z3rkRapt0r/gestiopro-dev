
import EmailTemplateEditor from "./EmailTemplateEditor";

interface VacationApprovalTemplateEditorProps {
  templateCategory: string;
}

const VacationApprovalTemplateEditor = ({ templateCategory }: VacationApprovalTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType="ferie-approvazione"
      templateCategory={templateCategory}
      defaultContent="Gentile {employee_name},\n\nLa tua richiesta di ferie è stata approvata.\n\nDettagli della richiesta:\n{leave_details}\n\nBuone vacanze!"
      defaultSubject="Richiesta Ferie Approvata"
      subjectEditable={true}
      contentEditable={true}
    />
  );
};

export default VacationApprovalTemplateEditor;
