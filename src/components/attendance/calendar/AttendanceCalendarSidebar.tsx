
import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { it } from 'date-fns/locale';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';

interface WorkSchedule {
  start_time: string;
  end_time: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface AttendanceCalendarSidebarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  workSchedule: WorkSchedule | null;
}

export default function AttendanceCalendarSidebar({ 
  selectedDate, 
  onDateSelect, 
  workSchedule 
}: AttendanceCalendarSidebarProps) {
  console.log('AttendanceCalendarSidebar - workSchedule ricevuto:', workSchedule);
  
  // Hook per le festività
  const { isHoliday, getHolidayName } = useCompanyHolidays();
  
  // Funzione per verificare se una data è una festività
  const isDateHoliday = (date: Date) => {
    return isHoliday(date);
  };
  
  // Funzione per ottenere il nome della festività
  const getHolidayNameForDate = (date: Date) => {
    return getHolidayName(date);
  };
  
  return (
    <Card className="xl:col-span-1">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="w-5 h-5" />
          Calendario Generale
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-center mb-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              console.log('Nuova data selezionata:', date);
              onDateSelect(date);
            }}
            locale={it}
            disabled={(date) => {
              // Blocca i giorni futuri (dopo oggi)
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date > today;
            }}
            className="rounded-lg border shadow-sm w-fit"
          />
        </div>
        
        {workSchedule ? (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-semibold text-blue-700 mb-2">Giorni Lavorativi:</div>
            <div className="text-xs text-blue-600 space-y-1">
              <div className="font-medium">Orari: {workSchedule.start_time} - {workSchedule.end_time}</div>
              <div className="flex flex-wrap gap-1">
                {workSchedule.monday && <span className="bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">Lun</span>}
                {workSchedule.tuesday && <span className="bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">Mar</span>}
                {workSchedule.wednesday && <span className="bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">Mer</span>}
                {workSchedule.thursday && <span className="bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">Gio</span>}
                {workSchedule.friday && <span className="bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">Ven</span>}
                {workSchedule.saturday && <span className="bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">Sab</span>}
                {workSchedule.sunday && <span className="bg-blue-100 px-2 py-0.5 rounded text-xs font-medium">Dom</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm font-medium text-yellow-700">
              Orari di lavoro non configurati
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              Configura gli orari nella sezione Impostazioni
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
