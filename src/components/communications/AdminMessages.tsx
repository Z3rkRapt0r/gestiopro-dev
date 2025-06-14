
import { useState } from "react";
import { useMessages, MessageRow, useSendMessage } from "@/hooks/useMessages";
import MessageItem from "./MessageItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminMessages() {
  const { messages, isLoading } = useMessages();
  const { sendMessage, isPending } = useSendMessage();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState<null | string>("all");
  const [sending, setSending] = useState(false);

  // Fetch lista dipendenti (solo id + nome + email)
  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,email")
        .eq("role", "employee")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const handleSend = async () => {
    setSending(true);
    try {
      let recipient_id: string | null = null;
      let recipient_emails: string[] = [];

      if (recipient === "all") {
        recipient_id = null; // messaggio globale
        recipient_emails =
          employees?.map((e: any) => e.email).filter(Boolean) ?? [];
      } else {
        recipient_id = recipient;
        const found = employees?.find((e: any) => e.id === recipient);
        if (found?.email) recipient_emails = [found.email];
      }

      await sendMessage({
        subject,
        body,
        recipient_id,
        recipient_emails,
      });
      setSubject("");
      setBody("");
      setRecipient("all");
    } catch (e) {
      alert("Errore invio messaggio");
    }
    setSending(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Comunicazioni</h2>

      {/* Form invio */}
      <div className="bg-white/80 border rounded-xl p-5 shadow space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <Input
            placeholder="Oggetto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <select
            className="rounded border px-3 py-2"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          >
            <option value="all">Tutti i dipendenti</option>
            {employees?.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.last_name} {e.first_name} ({e.email})
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="w-full rounded border p-2 mt-1 min-h-[80px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Inserisci qui il messaggio..."
          required
        />
        <Button
          onClick={handleSend}
          disabled={isPending || !subject || !body || sending}
        >
          Invia messaggio
        </Button>
      </div>

      <h3 className="text-lg font-semibold mt-8">Storico Messaggi</h3>
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className=" text-center py-16 text-gray-500">
          Nessuna comunicazione trovata.
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {messages.map((msg: MessageRow) => (
            <MessageItem key={msg.id} message={msg} onToggleRead={()=>{}} />
          ))}
        </div>
      )}
    </div>
  );
}
