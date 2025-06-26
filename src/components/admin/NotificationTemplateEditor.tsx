
import EmailTemplateEditor from "./EmailTemplateEditor";

const NotificationTemplateEditor = () => {
  const defaultContent = "Hai ricevuto una nuova notifica importante. Ti invitiamo a prenderne visione accedendo alla tua dashboard.";
  const defaultSubject = "Nuova Notifica";

  return (
    <EmailTemplateEditor
      templateType="notifiche"
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default NotificationTemplateEditor;
