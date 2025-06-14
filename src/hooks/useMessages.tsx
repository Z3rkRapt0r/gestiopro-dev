
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MessageRow {
  id: string;
  sender_id: string | null;
  recipient_id: string | null;
  is_global: boolean;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// Fetch tutti i messaggi per l'utente corrente (inclusi globali)
export function useMessages() {
  const { profile } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["messages", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`recipient_id.eq.${profile.id},is_global.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as MessageRow[];
    },
    enabled: !!profile?.id,
  });

  // Aggiorna stato letto/non letto
  const queryClient = useQueryClient();
  const { mutateAsync: markAsRead } = useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from("messages")
        .update({ is_read })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  return { messages: data || [], isLoading, error, markAsRead };
}

// Invio messaggio (solo admin)
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      subject,
      body,
      recipient_id, // se null invio globale
      recipient_emails,
    }: {
      subject: string;
      body: string;
      recipient_id: string | null;
      recipient_emails: string[];
    }) => {
      // Inserimento su Supabase
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: profile?.id ?? null,
            recipient_id,
            is_global: !recipient_id,
            subject,
            body,
            is_read: false,
          },
        ])
        .select();

      if (error) throw new Error(error.message);

      // Invio email tramite Edge Function
      await fetch(
        "https://nohufgceuqhkycsdffqj.functions.supabase.co/send-message-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails: recipient_emails,
            subject,
            body,
          }),
        }
      );
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  return { sendMessage: mutateAsync, isPending };
}
