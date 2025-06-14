
import { useState } from "react";
import DocumentUpload from "./DocumentUpload";

interface DocumentUploadDialogControllerProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  targetUserId?: string; // <-- AGGIUNTO
}

const DocumentUploadDialogController = ({
  onSuccess,
  trigger,
  targetUserId
}: DocumentUploadDialogControllerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
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
        targetUserId={targetUserId} // <-- Passa la prop
      />
    </>
  );
};

export default DocumentUploadDialogController;

