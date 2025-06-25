
import EmailTemplateEditor from "./EmailTemplateEditor";

interface NotificationTemplateEditorProps {
  templateCategory?: string;
  defaultContent?: string;
  defaultSubject?: string;
  subjectEditable?: boolean;
  contentEditable?: boolean;
}

const NotificationTemplateEditor = ({ 
  templateCategory = "generale",
  defaultContent = "Hai ricevuto una nuova notifica importante. Accedi alla dashboard per visualizzare tutti i dettagli.",
  defaultSubject = "Nuova Notifica",
  subjectEditable = true,
  contentEditable = true
}: NotificationTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType="notifiche"
      templateCategory={templateCategory}
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
      subjectEditable={subjectEditable}
      contentEditable={contentEditable}
    />
  );
};

export default NotificationTemplateEditor;
