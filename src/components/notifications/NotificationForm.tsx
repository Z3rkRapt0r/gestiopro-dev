
import { useState } from "react";
import { useNotificationForm } from "@/hooks/useNotificationForm";
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

const RECIPIENTS_OPTIONS = [
  { value: "ALL", label: "Tutti i dipendenti" },
  // Altri destinatari custom qui in futuro
];

interface Props {
  onCreated?: () => void;
}

const NotificationForm = ({ onCreated }: Props) => {
  const [subject, setSubject] = useState("");
  const [shortText, setShortText] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [recipientId, setRecipientId] = useState<string | null>("ALL");
  const [file, setFile] = useState<File | null>(null);

  const { sendNotification, loading } = useNotificationForm(onCreated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendNotification({
      recipientId: recipientId === "ALL" ? null : recipientId,
      subject: topic || subject,
      shortText,
      body,
      file,
      topic,
    });
    setSubject("");
    setShortText("");
    setBody("");
    setFile(null);
    setTopic("");
    setRecipientId("ALL");
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Select value={recipientId || "ALL"} onValueChange={setRecipientId}>
        <SelectTrigger>
          <SelectValue placeholder="Destinatario" />
        </SelectTrigger>
        <SelectContent>
          {RECIPIENTS_OPTIONS.map(r => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
        placeholder="Oggetto (opzionale, se serve diverso dall’argomento)"
        value={subject}
        onChange={e => setSubject(e.target.value)}
      />
      <Textarea
        placeholder="Messaggio breve"
        required
        value={shortText}
        onChange={e => setShortText(e.target.value)}
      />
      <Textarea
        placeholder="Messaggio completo (opzionale)"
        value={body}
        onChange={e => setBody(e.target.value)}
      />
      <Input
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.png,.jpeg,.gif"
        onChange={e => setFile(e.target.files?.[0] || null)}
      />
      <Button type="submit" loading={loading}>
        Invia notifica
      </Button>
    </form>
  );
};

export default NotificationForm;
