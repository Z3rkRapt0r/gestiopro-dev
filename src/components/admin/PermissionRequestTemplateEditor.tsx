
import EmailTemplateEditor from "./EmailTemplateEditor";

interface PermissionRequestTemplateEditorProps {
  templateCategory: string;
}

const PermissionRequestTemplateEditor = ({ templateCategory }: PermissionRequestTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType="permessi-richiesta"
      templateCategory={templateCategory}
      defaultContent={templateCategory === 'dipendenti' 
        ? "Gentile Amministratore,\n\nHai ricevuto una nuova richiesta di permesso da {employee_name}:\n\nAccedi alla dashboard per approvare o rifiutare la richiesta."
        : "La tua richiesta di permesso è stata ricevuta e verrà elaborata al più presto."
      }
      defaultSubject={templateCategory === 'dipendenti'
        ? "Nuova Richiesta Permesso da {employee_name}"
        : "Richiesta Permesso Ricevuta"
      }
      subjectEditable={true}
      contentEditable={true}
    />
  );
};

export default PermissionRequestTemplateEditor;
