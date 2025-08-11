
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useWorkingDaysValidation } from '@/hooks/useWorkingDaysValidation';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';

interface WorkingDaysPreviewProps {
  startDate: Date | null;
  endDate: Date | null;
  leaveType: string;
  employeeId?: string;
}

export default function WorkingDaysPreview({ 
  startDate, 
  endDate, 
  leaveType,
  employeeId
}: WorkingDaysPreviewProps) {
  const { countWorkingDays, workSchedule } = useWorkingDaysValidation(employeeId);
  const { isHoliday, getHolidayName } = useCompanyHolidays();

  if (!startDate || !endDate || !workSchedule) return null;

  const workingDaysCount = countWorkingDays(startDate, endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const nonWorkingDays = totalDays - workingDaysCount;
  
  // Trova festività nel periodo
  const holidaysInPeriod: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    if (isHoliday(current)) {
      const holidayName = getHolidayName(current);
      const dateStr = current.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      holidaysInPeriod.push(`${holidayName} (${dateStr})`);
    }
    current.setDate(current.getDate() + 1);
  }

  // Calcola altri giorni non lavorativi (escludendo festività)
  const otherNonWorkingDays = nonWorkingDays - holidaysInPeriod.length;

  return (
    <Card className="mt-3 border-blue-200 bg-blue-50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h4 className="font-medium text-blue-800 text-sm">
            Riepilogo Calcolo Ferie
          </h4>
        </div>
        
        {/* Risultato principale - compatto e responsive */}
        <div className="text-center p-3 bg-green-100 rounded mb-3">
          <div className="text-xl sm:text-2xl font-bold text-green-700">
            {workingDaysCount}
          </div>
          <div className="text-xs sm:text-sm text-green-600">
            giorni da scalare
          </div>
        </div>

        {/* Dettagli compatti e responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-gray-600 mb-3">
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-semibold text-blue-600">{totalDays}</div>
            <div className="text-xs">totale</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-semibold text-green-600">{workingDaysCount}</div>
            <div className="text-xs">lavorativi</div>
          </div>
          {nonWorkingDays > 0 && (
            <div className="text-center p-2 bg-white rounded border">
              <div className="font-semibold text-orange-600">{nonWorkingDays}</div>
              <div className="text-xs">non lavorativi</div>
            </div>
          )}
        </div>

        {/* Descrizione compatta dei giorni non lavorativi */}
        {nonWorkingDays > 0 && (
          <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
            <div className="font-medium text-orange-700 mb-1">
              I {nonWorkingDays} giorni non lavorativi includono:
            </div>
            <div className="space-y-1 text-orange-600">
              {holidaysInPeriod.length > 0 && (
                <div>• {holidaysInPeriod.length} festività: {holidaysInPeriod.join(', ')}</div>
              )}
              {otherNonWorkingDays > 0 && (
                <div>• {otherNonWorkingDays} weekend/giorni fuori orario</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
