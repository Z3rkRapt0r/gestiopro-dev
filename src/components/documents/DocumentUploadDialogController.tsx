
import { useState } from "react";
import DocumentUpload from "./DocumentUpload";

interface DocumentUploadDialogControllerProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode; // Esempio: un bottone
}

const DocumentUploadDialogController = ({
  onSuccess,
  trigger
}: DocumentUploadDialogControllerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger custom, oppure niente */}
      {trigger ? (
        <span onClick={() => setOpen(true)} style={{ display: 'inline-flex' }}>
          {trigger}
        </span>
      ) : null}
      <DocumentUpload
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setOpen(false);
          onSuccess && onSuccess();
        }}
      />
    </>
  );
};

export default DocumentUploadDialogController;
