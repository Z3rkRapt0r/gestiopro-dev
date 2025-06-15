
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const { profile } = useAuth();

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
      if (!profile?.id) {
        toast({ title: "Profilo non trovato", variant: "destructive" });
        setLoading(false);
        return;
      }
      const payload: any = {
        type,
        note,
        status: "pending",
        user_id: profile.id, // fix: manda user_id per policy supabase!
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
    <Card className="bg-muted/40">
      <CardContent>
        <form className="space-y-6 p-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            {type === "permesso" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Giorno permesso</label>
                  <div className="rounded-md border bg-white">
                    <Calendar
                      mode="single"
                      selected={day as any}
                      onSelect={setDay}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
                <div className="flex flex-row gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Da (orario)</label>
                    <Input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">A (orario)</label>
                    <Input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} required />
                  </div>
                </div>
              </>
            )}
            {type === "ferie" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Dal</label>
                  <div className="rounded-md border bg-white">
                    <Calendar
                      mode="single"
                      selected={dateFrom as any}
                      onSelect={setDateFrom}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Al</label>
                  <div className="rounded-md border bg-white">
                    <Calendar
                      mode="single"
                      selected={dateTo as any}
                      onSelect={setDateTo}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note facoltative..."
            rows={2}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Invio..." : "Invia richiesta"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
