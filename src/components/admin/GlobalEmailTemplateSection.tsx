
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalEmailTemplateForm } from "./GlobalEmailTemplate/GlobalEmailTemplateForm";

// Wrapper molto semplice senza logica, solo struttura della card
const GlobalEmailTemplateSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalizzazione Email Generali</CardTitle>
      </CardHeader>
      <CardContent>
        <GlobalEmailTemplateForm />
      </CardContent>
    </Card>
  );
};

export default GlobalEmailTemplateSection;
