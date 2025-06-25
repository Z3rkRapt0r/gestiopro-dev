
import EmailTemplateEditor from "./EmailTemplateEditor";

interface NotificationTemplateEditorProps {
  templateCategory?: string;
  defaultContent?: string;
  defaultSubject?: string;
}

const NotificationTemplateEditor = ({ 
  templateCategory = "generale",
  defaultContent = "Hai ricevuto una nuova notifica importante. Accedi alla dashboard per visualizzare tutti i dettagli.",
  defaultSubject = "Nuova Notifica"
}: NotificationTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType="notifiche"
      templateCategory={templateCategory}
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default NotificationTemplateEditor;
