interface SickLeaveConflictIndicatorsProps {
  selectedUserId: string;
  isCalculatingConflicts: boolean;
  conflictDates: Date[];
}

export function SickLeaveConflictIndicators({ 
  selectedUserId, 
  isCalculatingConflicts, 
  conflictDates 
}: SickLeaveConflictIndicatorsProps) {
  if (!selectedUserId) return null;

  return (
    <>
      {/* Indicatore di calcolo conflitti */}
      {isCalculatingConflicts && (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          🔍 Calcolo conflitti in corso...
        </div>
      )}

      {/* Indicatore conflitti trovati */}
      {conflictDates.length > 0 && (
        <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ {conflictDates.length} date disabilitate per conflitti esistenti
        </div>
      )}
    </>
  );
}