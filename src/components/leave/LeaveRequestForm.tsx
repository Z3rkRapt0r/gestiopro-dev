
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
import { useLeaveBalanceValidation } from "@/hooks/useLeaveBalanceValidation";
import { useWorkSchedules } from "@/hooks/useWorkSchedules";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Mail, Info } from "lucide-react";

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

  const { insertMutation, isWorkingDay } = useLeaveRequests();
  const { workSchedule } = useWorkSchedules();
  const { notifyAdmin: sendAdminNotification } = useLeaveRequestNotifications();
  const { validateTimeRange, validateDateRange, validatePermessoDay } = useLeaveRequestValidation();
  const { balanceValidation, validateLeaveRequest } = useLeaveBalanceValidation();
  const { toast } = useToast();
  const { profile } = useAuth();

  // Validazione in tempo reale del bilancio
  const currentBalanceValidation = validateLeaveRequest(type, dateFrom, dateTo, day, timeFrom, timeTo);

  const validateForm = () => {
    const errors: string[] = [];

    // Controlli esistenti
    if (type === "permesso") {
      const dayValidation = validatePermessoDay(day);
      if (!dayValidation.isValid) {
        errors.push(dayValidation.error!);
      }

      if (timeFrom && timeTo) {
        const timeValidation = validateTimeRange(timeFrom, timeTo);
        if (!timeValidation.isValid) {
          errors.push(timeValidation.error!);
        }
      }

      if (day && !isWorkingDay(day)) {
        errors.push("Il giorno selezionato non è configurato come giorno lavorativo");
      }
    }

    if (type === "ferie") {
      const dateValidation = validateDateRange(dateFrom, dateTo);
      if (!dateValidation.isValid) {
        errors.push(dateValidation.error!);
      }
    }

    // Nuovi controlli del bilancio
    if (!currentBalanceValidation.hasBalance) {
      errors.push(currentBalanceValidation.errorMessage || "Bilancio non configurato");
    } else {
      if (currentBalanceValidation.exceedsVacationLimit) {
        errors.push(currentBalanceValidation.errorMessage || "Limite giorni ferie superato");
      }
      if (currentBalanceValidation.exceedsPermissionLimit) {
        errors.push(currentBalanceValidation.errorMessage || "Limite ore permessi superato");
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const getRequestDetails = () => {
    if (type === "permesso") {
      if (timeFrom && timeTo) {
        return `Giorno: ${day?.toLocaleDateString('it-IT')}\nOrario: ${timeFrom} - ${timeTo}${note ? `\nNote: ${note}` : ''}`;
      } else {
        return `Giorno: ${day?.toLocaleDateString('it-IT')}\nPermesso giornaliero${note ? `\nNote: ${note}` : ''}`;
      }
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
        status: "pending", // Cambiato da "approved" a "pending"
        user_id: profile.id,
        notify_employee: true,
      };

      if (type === "permesso") {
        payload.day = day?.toISOString().slice(0, 10);
        if (timeFrom && timeTo) {
          payload.time_from = timeFrom;
          payload.time_to = timeTo;
        }
      }

      if (type === "ferie") {
        payload.date_from = dateFrom?.toISOString().slice(0, 10);
        payload.date_to = dateTo?.toISOString().slice(0, 10);
      }

      const result = await insertMutation.mutateAsync(payload);
      
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
        description: "La richiesta è stata inviata all'amministratore per l'approvazione"
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

          {/* Info bilancio attuale */}
          {balanceValidation?.hasBalance && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div>Bilancio attuale:</div>
                  <div>• Ferie rimanenti: {balanceValidation.remainingVacationDays} giorni</div>
                  <div>• Permessi rimanenti: {balanceValidation.remainingPermissionHours} ore</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Info configurazione orari di lavoro */}
          {workSchedule && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-700 mb-2">Configurazione Orari di Lavoro:</div>
              <div className="text-xs text-blue-600 space-y-1">
                <div>Orari: {workSchedule.start_time} - {workSchedule.end_time}</div>
                <div className="flex flex-wrap gap-1">
                  {workSchedule.monday && <span className="bg-blue-100 px-1 rounded">Lun</span>}
                  {workSchedule.tuesday && <span className="bg-blue-100 px-1 rounded">Mar</span>}
                  {workSchedule.wednesday && <span className="bg-blue-100 px-1 rounded">Mer</span>}
                  {workSchedule.thursday && <span className="bg-blue-100 px-1 rounded">Gio</span>}
                  {workSchedule.friday && <span className="bg-blue-100 px-1 rounded">Ven</span>}
                  {workSchedule.saturday && <span className="bg-blue-100 px-1 rounded">Sab</span>}
                  {workSchedule.sunday && <span className="bg-blue-100 px-1 rounded">Dom</span>}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  {type === "permesso" 
                    ? "Solo i giorni lavorativi possono essere selezionati per i permessi" 
                    : "Le richieste saranno inviate all'amministratore per l'approvazione"
                  }
                </div>
              </div>
            </div>
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
                        // Disabilita giorni passati e giorni non lavorativi
                        return date < today || !isWorkingDay(date);
                      }}
                      modifiers={{
                        workingDay: (date) => isWorkingDay(date)
                      }}
                      modifiersStyles={{
                        workingDay: {
                          backgroundColor: '#f3f4f6',
                          color: '#374151'
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-row gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Da (orario) - Opzionale</label>
                    <Input 
                      type="time" 
                      value={timeFrom} 
                      onChange={e => setTimeFrom(e.target.value)} 
                      placeholder="Lascia vuoto per permesso giornaliero"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">A (orario) - Opzionale</label>
                    <Input 
                      type="time" 
                      value={timeTo} 
                      onChange={e => setTimeTo(e.target.value)} 
                      placeholder="Lascia vuoto per permesso giornaliero"
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
                      modifiers={{
                        workingDay: (date) => isWorkingDay(date)
                      }}
                      modifiersStyles={{
                        workingDay: {
                          backgroundColor: '#f3f4f6',
                          color: '#374151'
                        }
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
                      modifiers={{
                        workingDay: (date) => isWorkingDay(date)
                      }}
                      modifiersStyles={{
                        workingDay: {
                          backgroundColor: '#f3f4f6',
                          color: '#374151'
                        }
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
              onCheckedChange={(checked) => setNotifyAdmin(checked === true)}
            />
            <label htmlFor="notify-admin" className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Notifica l'amministratore via email
            </label>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={loading || !currentBalanceValidation.hasBalance || currentBalanceValidation.exceedsVacationLimit || currentBalanceValidation.exceedsPermissionLimit}
            >
              {loading ? "Invio..." : `Invia richiesta ${type}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
