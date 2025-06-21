
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { generateAttendancePDF } from '@/utils/pdfGenerator';
import { generateAttendanceExcel } from '@/utils/excelGenerator';
import { useToast } from '@/hooks/use-toast';

export default function AttendanceExportSection() {
  const [exportType, setExportType] = useState<'general' | 'operator'>('general');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [format_type, setFormatType] = useState<'excel' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { profile } = useAuth();
  const { toast } = useToast();

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: "Errore",
        description: "Seleziona un periodo valido",
        variant: "destructive"
      });
      return;
    }

    if (exportType === 'operator' && !selectedEmployee) {
      toast({
        title: "Errore", 
        description: "Seleziona un operatore",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // Filtra i dati in base ai parametri
      let filteredData = attendances?.filter(att => {
        const attDate = new Date(att.date);
        const isInRange = attDate >= dateFrom && attDate <= dateTo;
        
        if (exportType === 'operator') {
          return isInRange && att.user_id === selectedEmployee;
        }
        
        return isInRange;
      }) || [];

      // Aggiungi informazioni dipendente ai dati e assicurati che notes sia sempre definito
      const enrichedData = filteredData.map(att => {
        const employee = employees?.find(emp => emp.id === att.user_id);
        return {
          ...att,
          employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'N/A',
          employee_email: employee?.email || 'N/A',
          notes: att.notes || '' // Assicura che notes non sia undefined
        };
      });

      if (format_type === 'pdf') {
        const selectedEmployeeData = selectedEmployee ? 
          employees?.find(emp => emp.id === selectedEmployee) : null;
        
        await generateAttendancePDF({
          data: enrichedData,
          dateFrom,
          dateTo,
          exportType,
          selectedEmployee: selectedEmployeeData
        });
        
        toast({
          title: "Successo",
          description: `PDF generato con successo per ${enrichedData.length} record`
        });
      } else {
        await generateAttendanceExcel({
          data: enrichedData,
          dateFrom,
          dateTo,
          exportType,
          selectedEmployee: selectedEmployee ? employees?.find(emp => emp.id === selectedEmployee) : null
        });
        
        toast({
          title: "Successo",
          description: `Excel generato con successo per ${enrichedData.length} record`
        });
      }
    } catch (error) {
      console.error('Errore durante l\'esportazione:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'esportazione",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Esportazione Presenze
            {profile?.role === 'admin' && (
              <Badge variant="outline" className="ml-2">Vista Admin</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo di esportazione */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo di Esportazione</label>
            <Select value={exportType} onValueChange={(value: 'general' | 'operator') => setExportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Calendario Generale
                  </div>
                </SelectItem>
                <SelectItem value="operator">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Calendario per Operatore
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selezione operatore (solo se tipo = operator) */}
          {exportType === 'operator' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleziona Operatore</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Scegli un operatore..." />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selezione periodo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inizio</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={it}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fine</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={it}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Formato di esportazione */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Formato</label>
            <Select value={format_type} onValueChange={(value: 'excel' | 'pdf') => setFormatType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    PDF (.pdf)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pulsante esportazione */}
          <Button 
            onClick={handleExport} 
            className="w-full"
            disabled={!dateFrom || !dateTo || (exportType === 'operator' && !selectedEmployee) || isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Esportazione in corso...' : `Esporta ${format_type.toUpperCase()}`}
          </Button>

          {/* Anteprima dati */}
          {dateFrom && dateTo && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-700 mb-2">Anteprima Esportazione</div>
              <div className="text-xs text-blue-600 space-y-1">
                <div>Periodo: {format(dateFrom, 'dd/MM/yyyy', { locale: it })} - {format(dateTo, 'dd/MM/yyyy', { locale: it })}</div>
                <div>Tipo: {exportType === 'general' ? 'Calendario Generale' : 'Calendario per Operatore'}</div>
                {exportType === 'operator' && selectedEmployee && (
                  <div>Operatore: {employees?.find(e => e.id === selectedEmployee)?.first_name} {employees?.find(e => e.id === selectedEmployee)?.last_name}</div>
                )}
                <div>Formato: {format_type.toUpperCase()}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
