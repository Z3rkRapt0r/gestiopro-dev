
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AttendanceCheckInOut from '@/components/attendance/AttendanceCheckInOut';

export default function EmployeeAttendanceSection() {
  const queryClient = useQueryClient();

  // Aggiorna i dati quando il componente si monta
  useEffect(() => {
    console.log('Sezione presenze dipendente montata, invalidando tutte le query...');
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
  }, [queryClient]);

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 px-4">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Le Mie Presenze</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Registra la tua presenza
        </p>
      </div>

      <AttendanceCheckInOut />
    </div>
  );
}
