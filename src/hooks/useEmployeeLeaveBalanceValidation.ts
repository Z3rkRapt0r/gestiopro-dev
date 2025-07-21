
import { useEmployeeLeaveBalanceStats } from "@/hooks/useEmployeeLeaveBalanceStats";
import { formatDecimalHours } from "@/hooks/useLeaveBalanceValidation";

export interface EmployeeLeaveBalanceValidation {
  hasBalance: boolean;
  remainingVacationDays: number;
  remainingPermissionHours: number;
  exceedsVacationLimit: boolean;
  exceedsPermissionLimit: boolean;
  errorMessage?: string;
}

export function useEmployeeLeaveBalanceValidation(employeeId?: string) {
  const { leaveBalance, isLoading } = useEmployeeLeaveBalanceStats(employeeId);

  // Funzione helper per convertire ore e minuti in ore decimali
  const timeToDecimalHours = (timeFrom: string, timeTo: string): number => {
    const startTime = new Date(`1970-01-01T${timeFrom}:00`);
    const endTime = new Date(`1970-01-01T${timeTo}:00`);
    const diffMs = endTime.getTime() - startTime.getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  };

  const getWorkingDaysBetween = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lun-Ven
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const validateLeaveRequest = (
    type: "ferie" | "permesso",
    dateFrom?: Date | null,
    dateTo?: Date | null,
    day?: Date | null,
    timeFrom?: string,
    timeTo?: string
  ): EmployeeLeaveBalanceValidation => {
    console.log('Validazione richiesta amministratore per dipendente:', employeeId);
    console.log('Bilancio dipendente:', leaveBalance);

    // CONTROLLO RIGOROSO: nessun bilancio configurato
    if (!leaveBalance || !leaveBalance.hasBalance) {
      console.log('❌ Nessun bilancio configurato per il dipendente');
      return {
        hasBalance: false,
        remainingVacationDays: 0,
        remainingPermissionHours: 0,
        exceedsVacationLimit: true,
        exceedsPermissionLimit: true,
        errorMessage: "Il dipendente selezionato non ha bilanci configurati per l'anno corrente"
      };
    }

    if (type === "ferie" && dateFrom && dateTo) {
      // Calcola giorni lavorativi richiesti (Lun-Ven)
      const requestedDays = getWorkingDaysBetween(dateFrom, dateTo);
      const exceedsLimit = requestedDays > leaveBalance.remainingVacationDays;
      
      console.log(`Ferie richieste per dipendente: ${requestedDays} giorni, disponibili: ${leaveBalance.remainingVacationDays}`);
      
      // CONTROLLO RIGOROSO: anche 0 giorni disponibili blocca
      if (leaveBalance.remainingVacationDays <= 0) {
        console.log('❌ Nessun giorno di ferie disponibile per il dipendente');
        return {
          ...leaveBalance,
          exceedsVacationLimit: true,
          errorMessage: `Il dipendente non ha giorni di ferie disponibili (saldo: ${leaveBalance.remainingVacationDays})`
        };
      }
      
      return {
        ...leaveBalance,
        exceedsVacationLimit: exceedsLimit,
        errorMessage: exceedsLimit 
          ? `Richiesti ${requestedDays} giorni ma il dipendente ha disponibili solo ${leaveBalance.remainingVacationDays}`
          : undefined
      };
    }

    if (type === "permesso") {
      let requestedHours = 0;
      
      if (timeFrom && timeTo) {
        // Calcola ore decimali includendo i minuti
        requestedHours = timeToDecimalHours(timeFrom, timeTo);
        
        console.log(`Permesso richiesto per dipendente: ${formatDecimalHours(requestedHours)}, disponibili: ${formatDecimalHours(leaveBalance.remainingPermissionHours)}`);
        
        // CONTROLLO RIGOROSO: anche 0 ore disponibili blocca
        if (leaveBalance.remainingPermissionHours <= 0) {
          console.log('❌ Nessuna ora di permesso disponibile per il dipendente');
          return {
            ...leaveBalance,
            exceedsPermissionLimit: true,
            errorMessage: `Il dipendente non ha ore di permesso disponibili (saldo: ${formatDecimalHours(leaveBalance.remainingPermissionHours)})`
          };
        }
        
        if (requestedHours <= 0) {
          return {
            ...leaveBalance,
            exceedsPermissionLimit: true,
            errorMessage: "L'orario di fine deve essere successivo all'orario di inizio"
          };
        }
        
      } else {
        // No time specified = invalid permission request
        return {
          ...leaveBalance,
          exceedsPermissionLimit: true,
          errorMessage: "Orario di inizio e fine sono obbligatori per i permessi"
        };
      }

      const exceedsLimit = requestedHours > leaveBalance.remainingPermissionHours;

      return {
        ...leaveBalance,
        exceedsPermissionLimit: exceedsLimit,
        errorMessage: exceedsLimit 
          ? `Richieste ${formatDecimalHours(requestedHours)} ma il dipendente ha disponibili solo ${formatDecimalHours(leaveBalance.remainingPermissionHours)}`
          : undefined
      };
    }

    return leaveBalance;
  };

  return {
    leaveBalance,
    isLoading,
    validateLeaveRequest,
    formatDecimalHours
  };
}
