
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import OperatorAttendanceSection from './OperatorAttendanceSection';

export default function OperatorCalendarSection() {
  const queryClient = useQueryClient();

  // Aggiorna i dati quando il componente si monta
  useEffect(() => {
    console.log('Sezione calendario operatore montata, invalidando tutte le query...');
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
  }, [queryClient]);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Desktop optimized container */}
      <div className="w-full max-w-none">
        <div className="bg-background rounded-lg lg:rounded-xl border border-muted/60 shadow-sm">
          <div className="p-4 lg:p-6 xl:p-8">
            <OperatorAttendanceSection />
          </div>
        </div>
      </div>
    </div>
  );
}
