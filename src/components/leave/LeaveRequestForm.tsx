
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useLeaveRequestNotifications } from "@/hooks/useLeaveRequestNotifications";
import { useLeaveRequestValidation } from "./LeaveRequestFormValidation";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Mail } from "lucide-react";

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
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { insertMutation } = useLeaveRequests();
  const { notifyAdmin: sendAdminNotification } = useLeaveRequestNotifications();
  const { validateTimeRange, validateDateRange, validatePermessoDay } = useLeaveRequestValidation();
  const { toast } = useToast();
  const { profile } = useAuth();

  const validateForm = () => {
    const errors: string[] = [];

    if (type === "permesso") {
      const dayValidation = validatePermessoDay(day);
      if (!dayValidation.isValid) {
        errors.push(dayValidation.error!);
      }

      const timeValidation = validateTimeRange(timeFrom, timeTo);
      if (!timeValidation.isValid) {
        errors.push(timeValidation.error!);
      }
    }

    if (type === "ferie") {
      const dateValidation = validateDateRange(dateFrom, dateTo);
      if (!dateValidation.isValid) {
        errors.push(dateValidation.error!);
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const getRequestDetails = () => {
    if (type === "permesso") {
      return `Giorno: ${day?.toLocaleDateString('it-IT')}\nOrario: ${timeFrom} - ${timeTo}${note ? `\nNote: ${note}` : ''}`;
    } else {
      return `Dal: ${dateFrom?.toLocaleDateString('it-IT')}\nAl: ${dateTo?.toLocaleDateString('it-IT')}${note ? `\nNote: ${note}` : ''}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (!profile?.id) {
        toast({ title: "Profilo non trovato", variant: "destructive" });
        setLoading(false);
        return;
      }

      const payload: any = {
        type,
        note,
        status: "pending",
        user_id: profile.id,
        notify_employee: true, // Il dipendente vuole sempre essere notificato
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

      const result = await insertMutation.mutateAsync(payload);
      
      // Invia notifica all'amministratore se richiesto
      if (notifyAdmin && result) {
        const employeeName = `${profile.first_name} ${profile.last_name}`;
        await sendAdminNotification({
          requestId: result.id,
          employeeName,
          type,
          details: getRequestDetails(),
        });
      }

      toast({ 
        title: "Richiesta inviata", 
        description: notifyAdmin ? "L'amministratore è stato notificato via email" : "Richiesta salvata"
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      toast({ title: "Errore invio richiesta", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Card className="bg-muted/40">
      <CardContent>
        <form className="space-y-6 p-4" onSubmit={handleSubmit}>
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {validationErrors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

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
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-row gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Da (orario)</label>
                    <Input 
                      type="time" 
                      value={timeFrom} 
                      onChange={e => setTimeFrom(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">A (orario)</label>
                    <Input 
                      type="time" 
                      value={timeTo} 
                      onChange={e => setTimeTo(e.target.value)} 
                      required 
                    />
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
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
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
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || (dateFrom && date < dateFrom);
                      }}
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

          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox
              id="notify-admin"
              checked={notifyAdmin}
              onCheckedChange={setNotifyAdmin}
            />
            <label htmlFor="notify-admin" className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Notifica l'amministratore via email
            </label>
          </div>

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
