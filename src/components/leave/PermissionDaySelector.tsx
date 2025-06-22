
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LeaveCalendar } from "./LeaveCalendar";

interface PermissionDaySelectorProps {
  day: Date | null;
  timeFrom: string;
  timeTo: string;
  onDayChange: (date: Date | null) => void;
  onTimeFromChange: (time: string) => void;
  onTimeToChange: (time: string) => void;
}

export function PermissionDaySelector({
  day,
  timeFrom,
  timeTo,
  onDayChange,
  onTimeFromChange,
  onTimeToChange
}: PermissionDaySelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Giorno</Label>
        <div className="rounded-md border bg-white shadow-sm">
          <LeaveCalendar
            variant="permission"
            mode="single"
            selected={day as any}
            onSelect={onDayChange}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="time-from">Ora Inizio (opzionale)</Label>
          <Input
            id="time-from"
            type="time"
            value={timeFrom}
            onChange={(e) => onTimeFromChange(e.target.value)}
            placeholder="Lascia vuoto per permesso giornaliero"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time-to">Ora Fine (opzionale)</Label>
          <Input
            id="time-to"
            type="time"
            value={timeTo}
            onChange={(e) => onTimeToChange(e.target.value)}
            placeholder="Lascia vuoto per permesso giornaliero"
          />
        </div>
      </div>
    </div>
  );
}
