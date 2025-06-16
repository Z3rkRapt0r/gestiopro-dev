import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLeaveRequests, LeaveRequest } from "@/hooks/useLeaveRequests";

interface EditLeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
}

export default function EditLeaveRequestDialog({
  open,
  onOpenChange,
  request
}: EditLeaveRequestDialogProps) {
  const { toast } = useToast();
  const { updateRequestMutation } = useLeaveRequests();

  // Stati locali per i campi editabili
  const [note, setNote] = useState("");
  const [day, setDay] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  useEffect(() => {
    if (open && request) {
      setNote(request.note ?? "");
      setDay(request.day ?? "");
      setDateFrom(request.date_from ?? "");
      setDateTo(request.date_to ?? "");
      setTimeFrom(request.time_from ?? "");
      setTimeTo(request.time_to ?? "");
    }
  }, [open, request]);

  if (!request) return null;

  // Handler submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const values: Partial<LeaveRequest> = {
        note,
      };
      if (request.type === "permesso") {
        values.day = day || null;
        values.time_from = timeFrom || null;
        values.time_to = timeTo || null;
      }
      if (request.type === "ferie") {
        values.date_from = dateFrom || null;
        values.date_to = dateTo || null;
      }
      
      await updateRequestMutation.mutateAsync({ id: request.id, ...values });
      toast({ title: "Richiesta aggiornata con successo" });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating leave request:', error);
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica richiesta {request.type}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSave}>
          {request.type === "permesso" && (
            <>
              <div>
                <label className="block text-sm mb-1 font-medium">Giorno</label>
                <Input type="date" value={day ?? ""} required onChange={e => setDay(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm mb-1 font-medium">Ora da</label>
                  <Input type="time" value={timeFrom ?? ""} required onChange={e => setTimeFrom(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm mb-1 font-medium">Ora a</label>
                  <Input type="time" value={timeTo ?? ""} required onChange={e => setTimeTo(e.target.value)} />
                </div>
              </div>
            </>
          )}
          {request.type === "ferie" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm mb-1 font-medium">Dal</label>
                <Input type="date" value={dateFrom ?? ""} required onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-sm mb-1 font-medium">Al</label>
                <Input type="date" value={dateTo ?? ""} required onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm mb-1 font-medium">Note opzionali</label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Eventuali dettagli..." />
          </div>
          <DialogFooter className="space-x-2 flex-row justify-end">
            <Button type="submit" disabled={updateRequestMutation.isPending}>
              {updateRequestMutation.isPending ? "Salvataggio..." : "Salva"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annulla
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
