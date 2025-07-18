
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { ConflictLegend } from './ConflictLegend';
import { useLeaveConflicts } from '@/hooks/useLeaveConflicts';
import { useSickLeavesForCalendars } from '@/hooks/useSickLeavesForCalendars';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConflictCalendarProps {
  mode?: 'single' | 'range';
  selected?: Date | Date[];
  onSelect?: (date: Date | Date[] | undefined) => void;
  userId?: string;
  leaveType?: 'ferie' | 'permesso';
  disabled?: (date: Date) => boolean;
  className?: string;
  showLegend?: boolean;
}

export function ConflictCalendar({
  mode = 'single',
  selected,
  onSelect,
  userId,
  leaveType = 'ferie',
  disabled,
  className,
  showLegend = true,
}: ConflictCalendarProps) {
  const [conflictDates, setConflictDates] = useState<{
    [date: string]: {
      type: 'business_trip' | 'approved_leave' | 'existing_permission' | 'sick_leave' | 'existing_attendance';
      description: string;
      severity: 'critical' | 'warning' | 'info';
    };
  }>({});

  const [conflictStats, setConflictStats] = useState({
    business_trips: 0,
    approved_leaves: 0,
    existing_permissions: 0,
    sick_leaves: 0,
    existing_attendances: 0,
  });

  const { 
    conflictDates: leaveConflictDates, 
    isLoading: isLoadingLeaveConflicts,
    isDateDisabled 
  } = useLeaveConflicts(userId || '', leaveType);

  const { 
    getSickLeavesForDate,
    isUserSickOnDate 
  } = useSickLeavesForCalendars();

  useEffect(() => {
    if (!userId) return;

    const conflicts: typeof conflictDates = {};
    const stats = {
      business_trips: 0,
      approved_leaves: 0,
      existing_permissions: 0,
      sick_leaves: 0,
      existing_attendances: 0,
    };

    // Analizza i conflitti per i prossimi 365 giorni
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');

      // Controlla malattie
      if (isUserSickOnDate(userId, dateStr)) {
        const sickLeaves = getSickLeavesForDate(dateStr);
        const userSickLeave = sickLeaves.find(sl => sl.user_id === userId);
        
        conflicts[dateStr] = {
          type: 'sick_leave',
          description: `Malattia registrata${userSickLeave?.notes ? `: ${userSickLeave.notes}` : ''}`,
          severity: 'critical',
        };
        stats.sick_leaves++;
        continue;
      }

      // Controlla conflitti di ferie/permessi usando il hook esistente
      if (isDateDisabled(checkDate)) {
        // Determina il tipo di conflitto dal contesto
        // Questo è semplificato - potresti voler estendere useLeaveConflicts
        // per fornire dettagli più specifici sui tipi di conflitto
        conflicts[dateStr] = {
          type: 'approved_leave', // Default, andrebbe migliorato
          description: 'Conflitto con ferie/permessi esistenti',
          severity: 'critical',
        };
        stats.approved_leaves++;
      }
    }

    setConflictDates(conflicts);
    setConflictStats(stats);
  }, [userId, leaveType, isDateDisabled, getSickLeavesForDate, isUserSickOnDate]);

  const handleDisabled = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const hasConflict = conflictDates[dateStr];
    
    // Applica la logica di disabilitazione personalizzata se fornita
    if (disabled && disabled(date)) return true;
    
    // Disabilita se c'è un conflitto critico
    if (hasConflict && hasConflict.severity === 'critical') return true;
    
    // Usa la logica esistente del hook
    return isDateDisabled(date);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Calendar
        mode={mode as any}
        selected={selected as any}
        onSelect={onSelect as any}
        disabled={handleDisabled}
        conflictDates={conflictDates}
        className="pointer-events-auto"
      />
      
      {showLegend && (
        <ConflictLegend 
          stats={conflictStats}
          className="mt-4"
        />
      )}
      
      {isLoadingLeaveConflicts && (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          🔍 Calcolo conflitti in corso...
        </div>
      )}
    </div>
  );
}
