
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
  defaultContent,
  defaultSubject,
  subjectEditable = true,
  contentEditable = true
}: DocumentTemplateEditorProps) => {
  
  // Templates are now loaded from database - no hardcoded defaults
  const getDefaultContent = () => {
    return defaultContent || "";
  };

  const getDefaultSubject = () => {
    return defaultSubject || "";
  };

  return (
    <EmailTemplateEditor
      templateType={templateType}
      templateCategory={templateCategory}
      defaultContent={getDefaultContent()}
      defaultSubject={getDefaultSubject()}
      subjectEditable={subjectEditable}
      contentEditable={contentEditable}
    />
  );
};

export default DocumentTemplateEditor;
