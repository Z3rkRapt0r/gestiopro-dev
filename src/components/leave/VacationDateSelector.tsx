
import React from "react";
import { Label } from "@/components/ui/label";
import { LeaveCalendar } from "./LeaveCalendar";

interface VacationDateSelectorProps {
  dateFrom: Date | null;
  dateTo: Date | null;
  onDateFromChange: (date: Date | null) => void;
  onDateToChange: (date: Date | null) => void;
}

export function VacationDateSelector({ 
  dateFrom, 
  dateTo, 
  onDateFromChange, 
  onDateToChange 
}: VacationDateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>Data Inizio</Label>
        <div className="rounded-md border bg-white shadow-sm">
          <LeaveCalendar
            variant="vacation"
            mode="single"
            selected={dateFrom as any}
            onSelect={onDateFromChange}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Data Fine</Label>
        <div className="rounded-md border bg-white shadow-sm">
          <LeaveCalendar
            variant="vacation"
            mode="single"
            selected={dateTo as any}
            onSelect={onDateToChange}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today || (dateFrom && date < dateFrom);
            }}
          />
        </div>
      </div>
    </div>
  );
}
