import EmailTemplateEditor from "./EmailTemplateEditor";

interface AttendanceAlertTemplateEditorProps {
  templateCategory: string;
  defaultContent?: string;
  defaultSubject?: string;
  subjectEditable?: boolean;
  contentEditable?: boolean;
}

const AttendanceAlertTemplateEditor = ({ 
  templateCategory,
  defaultContent,
  defaultSubject,
  subjectEditable = true,
  contentEditable = true
}: AttendanceAlertTemplateEditorProps) => {
  
  const getDefaultContent = () => {
    return defaultContent || "";
  };

  const getDefaultSubject = () => {
    if (defaultSubject) return defaultSubject;
    
    return "Promemoria: Registrazione Entrata Mancante";
  };

  return (
    <EmailTemplateEditor
      templateType="avviso-entrata"
      templateCategory={templateCategory}
      defaultContent={getDefaultContent()}
      defaultSubject={getDefaultSubject()}
      subjectEditable={subjectEditable}
      contentEditable={contentEditable}
    />
  );
};

export default AttendanceAlertTemplateEditor;
