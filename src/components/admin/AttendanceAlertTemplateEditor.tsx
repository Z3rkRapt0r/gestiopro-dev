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
    if (defaultContent) return defaultContent;
    
    return "Gentile {employee_name},\n\nNotiamo che non hai ancora registrato la tua entrata per oggi.\n\nOrario previsto: {expected_time}\nOrario attuale: {current_time}\n\nTi ricordiamo di registrare la tua presenza il prima possibile.\n\nGrazie per la collaborazione.";
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
