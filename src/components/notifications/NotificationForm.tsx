
import { useState } from "react";
import { useNotificationForm } from "@/hooks/useNotificationForm";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOPICS = [
  "Aggiornamenti aziendali",
  "Comunicazioni importanti",
  "Eventi",
  "Avvisi sicurezza",
];

interface Props {
  onCreated?: () => void;
}

const NotificationForm = ({ onCreated }: Props) => {
  const [subject, setSubject] = useState("");
  const [shortText, setShortText] = useState("");
  const [topic, setTopic] = useState("");
  const [recipientId, setRecipientId] = useState<string>("ALL");

  const { employees, loading: loadingEmployees } = useActiveEmployees();
  const { sendNotification, loading } = useNotificationForm(onCreated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use custom subject if provided, otherwise use topic
    const finalSubject = subject.trim() || topic;
    
    await sendNotification({
      recipientId: recipientId === "ALL" ? null : recipientId,
      subject: finalSubject,
      shortText,
      body: undefined,
      file: null,
      topic,
    });
    setSubject("");
    setShortText("");
    setTopic("");
    setRecipientId("ALL");
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Select
        value={recipientId}
        onValueChange={setRecipientId}
        disabled={loadingEmployees}
      >
        <SelectTrigger>
          <SelectValue placeholder="Destinatario" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tutti i dipendenti</SelectItem>
          {employees.map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              {(emp.first_name || "") + " " + (emp.last_name || "")} {emp.email && `(${emp.email})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={topic} onValueChange={setTopic}>
        <SelectTrigger>
          <SelectValue placeholder="Seleziona argomento" />
        </SelectTrigger>
        <SelectContent>
          {TOPICS.map(t =>
            <SelectItem key={t} value={t}>{t}</SelectItem>
          )}
        </SelectContent>
      </Select>
      <Input
        placeholder="Oggetto (opzionale, se serve diverso dall'argomento)"
        value={subject}
        onChange={e => setSubject(e.target.value)}
      />
      <Textarea
        placeholder="Messaggio"
        required
        value={shortText}
        onChange={e => setShortText(e.target.value)}
      />
      <Button type="submit" disabled={loading || loadingEmployees}>
        Invia notifica
      </Button>
    </form>
  );
};

export default NotificationForm;
