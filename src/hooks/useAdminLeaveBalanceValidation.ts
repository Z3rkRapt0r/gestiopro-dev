
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AdminLeaveBalanceValidation {
  hasBalance: boolean;
  remainingVacationDays: number;
  remainingPermissionHours: number;
  exceedsVacationLimit: boolean;
  exceedsPermissionLimit: boolean;
  errorMessage?: string;
  totalVacationDays: number;
  totalPermissionHours: number;
  usedVacationDays: number;
  usedPermissionHours: number;
}

export function useAdminLeaveBalanceValidation(employeeId?: string) {
  const { profile } = useAuth();

  const { data: balanceValidation, isLoading, refetch } = useQuery({
    queryKey: ["admin_leave_balance_validation", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;

      const currentYear = new Date().getFullYear();
      
      const { data: balance, error } = await supabase
        .from("employee_leave_balance")
        .select("*")
        .eq("user_id", employeeId)
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
          totalVacationDays: 0,
          totalPermissionHours: 0,
          usedVacationDays: 0,
          usedPermissionHours: 0,
          errorMessage: "Nessun bilancio configurato per l'anno corrente"
        } as AdminLeaveBalanceValidation;
      }

      const remainingVacationDays = Math.max(0, balance.vacation_days_total - balance.vacation_days_used);
      const remainingPermissionHours = Math.max(0, balance.permission_hours_total - balance.permission_hours_used);

      return {
        hasBalance: true,
        remainingVacationDays,
        remainingPermissionHours,
        exceedsVacationLimit: false,
        exceedsPermissionLimit: false,
        totalVacationDays: balance.vacation_days_total,
        totalPermissionHours: balance.permission_hours_total,
        usedVacationDays: balance.vacation_days_used,
        usedPermissionHours: balance.permission_hours_used,
      } as AdminLeaveBalanceValidation;
    },
    enabled: !!employeeId && !!profile?.id,
  });

  const validateLeaveRequest = (
    type: "ferie" | "permesso",
    dateFrom?: Date | null,
    dateTo?: Date | null,
    day?: Date | null,
    timeFrom?: string,
    timeTo?: string
  ): AdminLeaveBalanceValidation => {
    if (!balanceValidation || !balanceValidation.hasBalance) {
      return {
        hasBalance: false,
        remainingVacationDays: 0,
        remainingPermissionHours: 0,
        exceedsVacationLimit: true,
        exceedsPermissionLimit: true,
        totalVacationDays: 0,
        totalPermissionHours: 0,
        usedVacationDays: 0,
        usedPermissionHours: 0,
        errorMessage: "Nessun bilancio configurato per l'anno corrente"
      };
    }

    if (type === "ferie" && dateFrom && dateTo) {
      // Calcola giorni lavorativi richiesti (Lun-Ven)
      const requestedDays = getWorkingDaysBetween(dateFrom, dateTo);
      const exceedsLimit = requestedDays > balanceValidation.remainingVacationDays;
      
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
      } else if (day) {
        // Permesso giornaliero = 8 ore
        requestedHours = 8;
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
