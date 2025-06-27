
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useAuth } from "@/hooks/useAuth";
import { LeaveRequestFormValidation } from './LeaveRequestFormValidation';

interface LeaveRequestFormProps {
  type?: "permesso" | "ferie";
  onSuccess?: () => void;
}

export default function LeaveRequestForm({ type: initialType = "ferie", onSuccess }: LeaveRequestFormProps) {
  const [type, setType] = useState<"permesso" | "ferie">(initialType);
  const [day, setDay] = useState<Date>();
  const [time_from, setTimeFrom] = useState<string>("");
  const [time_to, setTimeTo] = useState<string>("");
  const [date_from, setDateFrom] = useState<Date>();
  const [date_to, setDateTo] = useState<Date>();
  const [note, setNote] = useState<string>("");
  const { user } = useAuth();
  const { insertMutation } = useLeaveRequests();
  const [validationBlocked, setValidationBlocked] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationBlocked) {
      return;
    }

    console.log('Invio richiesta con struttura organizzativa italiana');

    insertMutation.mutate({
      user_id: user?.id,
      type,
      day: day ? format(day, "yyyy-MM-dd") : null,
      time_from: time_from || null,
      time_to: time_to || null,
      date_from: date_from ? format(date_from, "yyyy-MM-dd") : null,
      date_to: date_to ? format(date_to, "yyyy-MM-dd") : null,
      note: note || null,
    }, {
      onSuccess: () => {
        setDay(undefined);
        setTimeFrom("");
        setTimeTo("");
        setDateFrom(undefined);
        setDateTo(undefined);
        setNote("");
        
        if (onSuccess) {
          onSuccess();
        }
      }
    });
  };

  const handleTypeChange = (value: string) => {
    setType(value as "permesso" | "ferie");
  };

  return (
    <LeaveRequestFormValidation
      onValidationChange={(isValid, message) => {
        setValidationBlocked(!isValid);
      }}
    >
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Richiesta Ferie/Permesso - Struttura Organizzativa Italiana</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo di richiesta</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Seleziona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ferie">Ferie</SelectItem>
                  <SelectItem value="permesso">Permesso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "permesso" && (
              <div className="space-y-2">
                <Label>Giorno del permesso</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {day ? format(day, "dd/MM/yyyy", { locale: it }) : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={day}
                      onSelect={setDay}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {type === "permesso" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time_from">Ora inizio</Label>
                  <Input
                    type="time"
                    id="time_from"
                    value={time_from}
                    onChange={(e) => setTimeFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_to">Ora fine</Label>
                  <Input
                    type="time"
                    id="time_to"
                    value={time_to}
                    onChange={(e) => setTimeTo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {type === "ferie" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data inizio ferie</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date_from ? format(date_from, "dd/MM/yyyy", { locale: it }) : <span>Seleziona data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date_from}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Data fine ferie</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date_to ? format(date_to, "dd/MM/yyyy", { locale: it }) : <span>Seleziona data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date_to}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Aggiungi una nota (opzionale)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={insertMutation.isPending || validationBlocked}
            >
              {insertMutation.isPending ? "Inviando richiesta..." : "Invia Richiesta con Struttura Italiana"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </LeaveRequestFormValidation>
  );
}
