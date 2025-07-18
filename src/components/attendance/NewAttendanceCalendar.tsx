
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import NewDailyAttendanceCalendar from './NewDailyAttendanceCalendar';

export default function NewAttendanceCalendar() {
  const queryClient = useQueryClient();

  // Aggiorna i dati quando il componente viene montato
  useEffect(() => {
    console.log('Caricamento calendario presenze generale, invalidando tutte le query...');
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
  }, [queryClient]);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Desktop optimized layout */}
      <div className="w-full">
        <NewDailyAttendanceCalendar />
      </div>
    </div>
  );
}
