
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface EmployeeLeaveBalance {
  id: string;
  user_id: string;
  year: number;
  vacation_days_total: number;
  vacation_days_used: number;
  permission_hours_total: number;
  permission_hours_used: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export function useEmployeeLeaveBalance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === "admin";

  // Get all employee leave balances (admin only) or user's own balance
  const { data: leaveBalances, isLoading, error } = useQuery({
    queryKey: ["employee_leave_balance", isAdmin ? "admin" : "user"],
    queryFn: async () => {
      let query = supabase
        .from("employee_leave_balance")
        .select(`
          *,
          profiles: user_id (first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });

      if (!isAdmin && profile?.id) {
        query = query.eq("user_id", profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data as any[]).map((item) => ({
        ...item,
        profiles: item.profiles && item.profiles.first_name !== undefined
          ? item.profiles
          : undefined,
      })) as EmployeeLeaveBalance[];
    },
    enabled: !!profile,
  });

  // Create or update leave balance
  const upsertMutation = useMutation({
    mutationFn: async (payload: {
      user_id: string;
      year: number;
      vacation_days_total: number;
      permission_hours_total: number;
    }) => {
      const { error, data } = await supabase
        .from("employee_leave_balance")
        .upsert({
          ...payload,
          created_by: profile?.id,
        }, {
          onConflict: "user_id,year"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_leave_balance"] });
      toast({
        title: "Bilancio aggiornato",
        description: "Il bilancio ferie e permessi è stato aggiornato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento del bilancio.",
        variant: "destructive",
      });
    },
  });

  // Delete leave balance
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_leave_balance")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_leave_balance"] });
      toast({
        title: "Bilancio eliminato",
        description: "Il bilancio è stato eliminato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del bilancio.",
        variant: "destructive",
      });
    },
  });

  return {
    leaveBalances,
    isLoading,
    error,
    upsertMutation,
    deleteMutation,
    isAdmin,
  };
}
