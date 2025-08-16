import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const DocumentTitleManager = () => {
  // Questo componente non renderizza nulla, ma gestisce il titolo del documento
  useDocumentTitle();
  
  return null;
};

export default DocumentTitleManager;
