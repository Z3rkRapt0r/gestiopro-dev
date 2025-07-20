
import EmailTemplateEditor from "./EmailTemplateEditor";

interface LeaveApprovalTemplateEditorProps {
  templateCategory?: string;
}

const LeaveApprovalTemplateEditor = ({ 
  templateCategory = "amministratori"
}: LeaveApprovalTemplateEditorProps) => {
  const defaultContent = "Gentile Mario Rossi,\n\nLa tua richiesta di permesso è stata approvata dall'amministratore.\n\nDettagli:\nTipo: Permesso\nGiorno: 18 Giugno 2025\nOrario: 14:00 - 16:00\nMotivo: Visita medica\n\nNote amministratore: Richiesta approvata. Ricorda di recuperare le ore.";
  const defaultSubject = "Richiesta Approvata";

  return (
    <EmailTemplateEditor
      templateType="permessi-approvazione"
      templateCategory={templateCategory}
      defaultContent={defaultContent}
      defaultSubject={defaultSubject}
    />
  );
};

export default LeaveApprovalTemplateEditor;
