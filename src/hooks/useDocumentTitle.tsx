import { useEffect } from "react";
import { useAppGeneralSettings } from "./useAppGeneralSettings";

export function useDocumentTitle() {
  const { getCurrentTitle } = useAppGeneralSettings();

  useEffect(() => {
    const title = getCurrentTitle();
    if (title && title !== document.title) {
      document.title = title;
    }
  }, [getCurrentTitle]);

  // Funzione per aggiornare manualmente il titolo
  const updateTitle = (newTitle: string) => {
    document.title = newTitle;
  };

  // Funzione per ripristinare il titolo dalle impostazioni
  const resetTitle = () => {
    const title = getCurrentTitle();
    if (title) {
      document.title = title;
    }
  };

  return {
    updateTitle,
    resetTitle,
  };
}
