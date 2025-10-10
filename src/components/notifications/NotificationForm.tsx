
import { useState } from "react";
import { useNotificationForm } from "@/hooks/useNotificationForm";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Users, Send } from "lucide-react";

// Rimuoviamo la selezione di categorie - tutto diventa "notifiche"

interface Props {
  onCreated?: () => void;
}

const NotificationForm = ({ onCreated }: Props) => {
  const [subject, setSubject] = useState("");
  const [shortText, setShortText] = useState("");
  // Rimuoviamo topic - tutto diventa "notifiche"
  const [recipientId, setRecipientId] = useState<string>("ALL");

  const { employees, loading: loadingEmployees } = useActiveEmployees();
  const { sendNotification, loading } = useNotificationForm(onCreated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Send notification with original topic for proper categorization
    await sendNotification({
      recipientId: recipientId === "ALL" ? null : recipientId,
      subject: subject.trim(), // Use subject as-is (can be empty)
      shortText,
      body: undefined,
      file: null,
      topic: "notifiche", // Sempre "notifiche"
    });
    setSubject("");
    setShortText("");
    setRecipientId("ALL");
  };

  const selectedEmployeesCount = recipientId === "ALL" ? employees.length : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Nuova Notifica Email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Destinatari
            </label>
            <Select
              value={recipientId}
              onValueChange={setRecipientId}
              // Allow opening even during loading; show fallback options
              disabled={false}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona destinatari" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {loadingEmployees ? 'Tutti i dipendenti' : `Tutti i dipendenti (${employees.length})`}
                  </div>
                </SelectItem>
                {loadingEmployees && (
                  <SelectItem value="loading" disabled>
                    Caricamento dipendenti...
                  </SelectItem>
                )}
                {!loadingEmployees && employees.length === 0 && (
                  <SelectItem value="none" disabled>
                    Nessun dipendente attivo trovato
                  </SelectItem>
                )}
                {!loadingEmployees && employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {(emp.first_name || "") + " " + (emp.last_name || "")} {emp.email && `(${emp.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedEmployeesCount} destinatari selezionati
            </p>
          </div>

          {/* Rimuoviamo la selezione di argomento - tutto diventa "notifiche" */}

          <div>
            <label className="block text-sm font-medium mb-2">
              Oggetto Email (opzionale)
            </label>
            <Input
              placeholder="Inserisci l'oggetto dell'email (se vuoto verrà usato quello del template)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              {subject.trim() 
                ? `Oggetto personalizzato: "${subject.trim()}"` 
                : "Verrà usato l'oggetto configurato nel template email"
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Messaggio *</label>
            <Textarea
              placeholder="Scrivi qui il contenuto della comunicazione..."
              required
              value={shortText}
              onChange={e => setShortText(e.target.value)}
              rows={6}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || loadingEmployees || !shortText.trim()}
            className="w-full"
          >
            {loading ? (
              "Invio in corso..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Invia Notifica Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NotificationForm;
