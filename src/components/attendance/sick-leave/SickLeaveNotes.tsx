import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SickLeaveNotesProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function SickLeaveNotes({ notes, onNotesChange }: SickLeaveNotesProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="notes">Note</Label>
      <Textarea
        id="notes"
        placeholder="Note aggiuntive sulla malattia (opzionale)"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}