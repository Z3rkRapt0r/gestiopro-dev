
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Users } from 'lucide-react';
import { useAttendances } from '@/hooks/useAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import EmployeeAttendanceCalendar from './EmployeeAttendanceCalendar';

export default function AttendanceCalendar() {
  const { attendances, isLoading } = useAttendances();
  const { employees } = useActiveEmployees();

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
            <CalendarDays className="w-5 h-5" />
            Calendario Presenze
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nessun dipendente trovato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Calendario Presenze per Operatore
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={employees[0]?.id} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(employees.length, 4)}, 1fr)` }}>
            {employees.slice(0, 4).map((employee) => (
              <TabsTrigger key={employee.id} value={employee.id} className="text-xs">
                {employee.first_name} {employee.last_name?.charAt(0)}.
              </TabsTrigger>
            ))}
          </TabsList>

          {employees.map((employee) => (
            <TabsContent key={employee.id} value={employee.id} className="mt-6">
              <EmployeeAttendanceCalendar
                employee={employee}
                attendances={attendances?.filter(att => att.user_id === employee.id) || []}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
