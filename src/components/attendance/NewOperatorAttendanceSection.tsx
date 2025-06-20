
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import NewEmployeeAttendanceCalendar from './NewEmployeeAttendanceCalendar';

export default function NewOperatorAttendanceSection() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();

  const selectedEmployee = employees?.find(emp => emp.id === selectedEmployeeId);
  const employeeAttendances = attendances?.filter(att => att.user_id === selectedEmployeeId) || [];

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

  if (!employees || employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Calendario Presenze per Operatore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nessun dipendente trovato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            Calendario Presenze per Operatore
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Seleziona Operatore</label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Scegli un operatore..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name} ({employee.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployee && (
            <NewEmployeeAttendanceCalendar
              employee={selectedEmployee}
              attendances={employeeAttendances}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
