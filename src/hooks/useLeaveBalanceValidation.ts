
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LeaveBalanceValidation {
  hasBalance: boolean;
  remainingVacationDays: number;
  remainingPermissionHours: number;
  exceedsVacationLimit: boolean;
  exceedsPermissionLimit: boolean;
  errorMessage?: string;
}

export function useLeaveBalanceValidation() {
  const { profile } = useAuth();

  const { data: balanceValidation, isLoading, refetch } = useQuery({
    queryKey: ["leave_balance_validation", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const currentYear = new Date().getFullYear();
      
      const { data: balance, error } = await supabase
        .from("employee_leave_balance")
        .select("*")
        .eq("user_id", profile.id)
        .eq("year", currentYear)
        .maybeSingle();

      if (error) throw error;

      if (!balance) {
        return {
          hasBalance: false,
          remainingVacationDays: 0,
          remainingPermissionHours: 0,
          exceedsVacationLimit: false,
          exceedsPermissionLimit: false,
          errorMessage: "Nessun bilancio configurato per l'anno corrente"
        } as LeaveBalanceValidation;
      }

      const remainingVacationDays = Math.max(0, balance.vacation_days_total - balance.vacation_days_used);
      const remainingPermissionHours = Math.max(0, balance.permission_hours_total - balance.permission_hours_used);

      return {
        hasBalance: true,
        remainingVacationDays,
        remainingPermissionHours,
        exceedsVacationLimit: false,
        exceedsPermissionLimit: false,
      } as LeaveBalanceValidation;
    },
    enabled: !!profile?.id,
  });

  const validateLeaveRequest = (
    type: "ferie" | "permesso",
    dateFrom?: Date | null,
    dateTo?: Date | null,
    day?: Date | null,
    timeFrom?: string,
    timeTo?: string
  ): LeaveBalanceValidation => {
    console.log('Validazione richiesta:', { type, dateFrom, dateTo, day, timeFrom, timeTo });
    console.log('Bilancio attuale:', balanceValidation);

    // CONTROLLO RIGOROSO: nessun bilancio configurato
    if (!balanceValidation || !balanceValidation.hasBalance) {
      console.log('❌ Nessun bilancio configurato');
      return {
        hasBalance: false,
        remainingVacationDays: 0,
        remainingPermissionHours: 0,
        exceedsVacationLimit: true,
        exceedsPermissionLimit: true,
        errorMessage: "Nessun bilancio configurato per l'anno corrente"
      };
    }

    if (type === "ferie" && dateFrom && dateTo) {
      // Calcola giorni lavorativi richiesti (Lun-Ven)
      const requestedDays = getWorkingDaysBetween(dateFrom, dateTo);
      const exceedsLimit = requestedDays > balanceValidation.remainingVacationDays;
      
      console.log(`Ferie richieste: ${requestedDays} giorni, disponibili: ${balanceValidation.remainingVacationDays}`);
      
      // CONTROLLO RIGOROSO: anche 0 giorni disponibili blocca
      if (balanceValidation.remainingVacationDays <= 0) {
        console.log('❌ Nessun giorno di ferie disponibile');
        return {
          ...balanceValidation,
          exceedsVacationLimit: true,
          errorMessage: `Non hai giorni di ferie disponibili (saldo: ${balanceValidation.remainingVacationDays})`
        };
      }
      
      return {
        ...balanceValidation,
        exceedsVacationLimit: exceedsLimit,
        errorMessage: exceedsLimit 
          ? `Richiesti ${requestedDays} giorni ma disponibili solo ${balanceValidation.remainingVacationDays}`
          : undefined
      };
    }

    if (type === "permesso") {
      let requestedHours = 0;
      
      if (timeFrom && timeTo) {
        // Permesso orario
        const startTime = new Date(`1970-01-01T${timeFrom}:00`);
        const endTime = new Date(`1970-01-01T${timeTo}:00`);
        requestedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        console.log(`Permesso richiesto: ${requestedHours} ore, disponibili: ${balanceValidation.remainingPermissionHours}`);
        
        // CONTROLLO RIGOROSO: anche 0 ore disponibili blocca
        if (balanceValidation.remainingPermissionHours <= 0) {
          console.log('❌ Nessuna ora di permesso disponibile');
          return {
            ...balanceValidation,
            exceedsPermissionLimit: true,
            errorMessage: `Non hai ore di permesso disponibili (saldo: ${balanceValidation.remainingPermissionHours})`
          };
        }
        
        if (requestedHours <= 0) {
          return {
            ...balanceValidation,
            exceedsPermissionLimit: true,
            errorMessage: "L'orario di fine deve essere successivo all'orario di inizio"
          };
        }
        
      } else {
        // No time specified = invalid permission request
        return {
          ...balanceValidation,
          exceedsPermissionLimit: true,
          errorMessage: "Orario di inizio e fine sono obbligatori per i permessi"
        };
      }

      const exceedsLimit = requestedHours > balanceValidation.remainingPermissionHours;

      return {
        ...balanceValidation,
        exceedsPermissionLimit: exceedsLimit,
        errorMessage: exceedsLimit 
          ? `Richieste ${requestedHours} ore ma disponibili solo ${balanceValidation.remainingPermissionHours}`
          : undefined
      };
    }

    return balanceValidation;
  };

  return {
    balanceValidation,
    isLoading,
    validateLeaveRequest,
    refetch
  };
}

function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
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
}
