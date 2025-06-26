
import EmailTemplateEditor from "./EmailTemplateEditor";

interface VacationRequestTemplateEditorProps {
  templateCategory: string;
}

const VacationRequestTemplateEditor = ({ templateCategory }: VacationRequestTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType="ferie-richiesta"
      templateCategory={templateCategory}
      defaultContent={templateCategory === 'dipendenti' 
        ? "Gentile Amministratore,\n\nHai ricevuto una nuova richiesta di ferie da {employee_name}.\n\nNote del dipendente:\n{employee_note}\n\nAccedi alla dashboard per approvare o rifiutare la richiesta."
        : "La tua richiesta di ferie è stata ricevuta e verrà elaborata al più presto."
      }
      defaultSubject={templateCategory === 'dipendenti'
        ? "Nuova Richiesta Ferie da {employee_name}"
        : "Richiesta Ferie Ricevuta"
      }
      subjectEditable={true}
      contentEditable={true}
    />
  );
};

export default VacationRequestTemplateEditor;
