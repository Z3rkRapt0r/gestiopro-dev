
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
  
  // NEW: Set different defaults based on template category
  const getDefaultContent = () => {
    if (defaultContent) return defaultContent;
    
    if (templateCategory === 'amministratori') {
      // Admin to employee template - include admin message variable
      return "Gentile {employee_name},\n\nè disponibile un nuovo documento per te. Il documento contiene informazioni importanti che richiedono la tua attenzione.\n\n{admin_message}\n\nAccedi alla dashboard per visualizzare il documento.";
    } else {
      // Employee to admin template
      return "È disponibile un nuovo documento per la tua revisione. Il documento contiene informazioni importanti che richiedono la tua attenzione.";
    }
  };

  const getDefaultSubject = () => {
    if (defaultSubject) return defaultSubject;
    
    if (templateCategory === 'amministratori') {
      return "Nuovo Documento Disponibile";
    } else {
      return "Nuovo Documento da {employee_name}";
    }
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
