
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Info, AlertCircle } from 'lucide-react';
import { useWorkingDaysValidation } from '@/hooks/useWorkingDaysValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WorkingDaysPreviewProps {
  startDate: Date | null;
  endDate: Date | null;
  leaveType: string;
}

export default function WorkingDaysPreview({ 
  startDate, 
  endDate, 
  leaveType 
}: WorkingDaysPreviewProps) {
  const { countWorkingDays, getWorkingDaysLabels, workSchedule } = useWorkingDaysValidation();

  if (!startDate || !endDate || !workSchedule) return null;

  const workingDaysCount = countWorkingDays(startDate, endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const nonWorkingDays = totalDays - workingDaysCount;
  
  const workingDaysLabels = getWorkingDaysLabels();

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="space-y-3 flex-1">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">
                Riepilogo Calcolo {leaveType === 'ferie' ? 'Ferie' : 'Permessi'}
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Giorni totali selezionati:</span>
                  <span className="ml-2 font-bold">{totalDays}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Giorni lavorativi:</span>
                  <span className="ml-2 font-bold text-blue-800">{workingDaysCount}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Giorni non lavorativi:</span>
                  <span className="ml-2 font-bold text-gray-600">{nonWorkingDays}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Giorni da scalare:</span>
                  <span className="ml-2 font-bold text-red-600">{workingDaysCount}</span>
                </div>
              </div>
            </div>

            {workingDaysLabels.length > 0 && (
              <div className="text-xs text-blue-700">
                <strong>Giorni lavorativi configurati:</strong> {workingDaysLabels.join(', ')}
              </div>
            )}

            {nonWorkingDays > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700 text-sm">
                  I {nonWorkingDays} giorni non lavorativi nel periodo selezionato 
                  <strong> non verranno conteggiati</strong> come {leaveType}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
