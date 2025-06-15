
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useToast } from "@/hooks/use-toast";

interface LeaveRequestFormProps {
  type: "permesso" | "ferie";
  onSuccess: () => void;
}

export default function LeaveRequestForm({ type, onSuccess }: LeaveRequestFormProps) {
  const [day, setDay] = useState<Date | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { insertMutation } = useLeaveRequests();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === "permesso") {
        if (!day || !timeFrom || !timeTo) {
          toast({ title: "Compila tutti i campi del permesso.", variant: "destructive" });
          setLoading(false);
          return;
        }
      }
      if (type === "ferie") {
        if (!dateFrom || !dateTo) {
          toast({ title: "Seleziona intervallo date ferie.", variant: "destructive" });
          setLoading(false);
          return;
        }
      }
      const payload: any = {
        type,
        note,
        status: "pending",
      };
      if (type === "permesso") {
        payload.day = day?.toISOString().slice(0, 10);
        payload.time_from = timeFrom;
        payload.time_to = timeTo;
      }
      if (type === "ferie") {
        payload.date_from = dateFrom?.toISOString().slice(0, 10);
        payload.date_to = dateTo?.toISOString().slice(0, 10);
      }

      await insertMutation.mutateAsync(payload);
      toast({ title: "Richiesta inviata" });
      onSuccess();
    } catch {
      toast({ title: "Errore invio richiesta", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {type === "permesso" && (
        <>
          <label className="block text-sm font-medium">Giorno permesso</label>
          <Calendar
            mode="single"
            selected={day as any}
            onSelect={setDay}
            className="pointer-events-auto"
          />
          <div className="flex gap-2">
            <div>
              <label className="block text-sm font-medium">Da (orario)</label>
              <Input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium">A (orario)</label>
              <Input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} required />
            </div>
          </div>
        </>
      )}
      {type === "ferie" && (
        <>
          <label className="block text-sm font-medium">Dal</label>
          <Calendar
            mode="single"
            selected={dateFrom as any}
            onSelect={setDateFrom}
            className="pointer-events-auto"
          />
          <label className="block text-sm font-medium">Al</label>
          <Calendar
            mode="single"
            selected={dateTo as any}
            onSelect={setDateTo}
            className="pointer-events-auto"
          />
        </>
      )}
      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Note facoltative..."
        rows={2}
      />
      <Button type="submit" disabled={loading}>{loading ? "Invio..." : "Invia richiesta"}</Button>
    </form>
  );
}
