
import EmailTemplateEditor from "./EmailTemplateEditor";

interface DocumentTemplateEditorProps {
  templateType?: string;
  templateCategory?: string;
  defaultContent?: string;
  defaultSubject?: string;
  subjectEditable?: boolean;
  contentEditable?: boolean;
}

const DocumentTemplateEditor = ({ 
  templateType = "documenti",
  templateCategory = "generale",
  defaultContent = "È disponibile un nuovo documento per la tua revisione. Il documento contiene informazioni importanti che richiedono la tua attenzione.",
  defaultSubject = "Nuovo Documento Disponibile",
  subjectEditable = true,
  contentEditable = true
}: DocumentTemplateEditorProps) => {
  return (
    <EmailTemplateEditor
      templateType={templateType}
      templateCategory={templateCategory}
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
      subjectEditable={subjectEditable}
      contentEditable={contentEditable}
    />
  );
};

export default DocumentTemplateEditor;
