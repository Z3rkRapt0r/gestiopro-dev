
import EmailTemplateEditor from "./EmailTemplateEditor";

const DocumentTemplateEditor = () => {
  const defaultContent = "È disponibile un nuovo documento per la tua revisione. Il documento contiene informazioni importanti che richiedono la tua attenzione.";
  const defaultSubject = "Nuovo Documento Disponibile";

  return (
    <EmailTemplateEditor
      templateType="documenti"
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default DocumentTemplateEditor;
