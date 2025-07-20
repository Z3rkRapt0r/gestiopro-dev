
import EmailTemplateEditor from "./EmailTemplateEditor";

interface LeaveRequestTemplateEditorProps {
  templateCategory?: string;
}

const LeaveRequestTemplateEditor = ({ 
  templateCategory = "dipendenti"
}: LeaveRequestTemplateEditorProps) => {
  const defaultContent = "Gentile Amministratore,\n\nHai ricevuto una nuova richiesta di permesso da {employee_name}.\n\nDettagli:\nTipo: Permesso\nGiorno: 18 Giugno 2025\nOrario: 14:00 - 16:00\nMotivo: Visita medica\n\nAccedi alla dashboard per approvare o rifiutare la richiesta.";
  const defaultSubject = "Nuova Richiesta Permesso";

  return (
    <EmailTemplateEditor
      templateType="permessi-richiesta"
      templateCategory={templateCategory}
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default LeaveRequestTemplateEditor;
