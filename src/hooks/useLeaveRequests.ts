
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LeaveRequest = {
  id: string;
  user_id: string;
  type: "permesso" | "ferie";
  day?: string | null;
  time_from?: string | null;
  time_to?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }
};

export function useLeaveRequests() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const queryClient = useQueryClient();

  // For admin: get all, for employee/user: get own
  const { data, isLoading, error } = useQuery({
    queryKey: ["leave_requests", isAdmin ? "admin" : "user"],
    queryFn: async () => {
      let query = supabase.from("leave_requests").select(`
        *,
        profiles: user_id (first_name, last_name, email)
      `).order("created_at", { ascending: false });

      if (!isAdmin && profile?.id) {
        query = query.eq("user_id", profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fix: Filtro/trasformo profiles: può essere {error: true} se manca!
      const mapped = (data as any[]).map((item) => ({
        ...item,
        profiles: item.profiles && item.profiles.first_name !== undefined
          ? item.profiles
          : undefined,
      })) as LeaveRequest[];
      return mapped;
    },
    enabled: !!profile,
  });

  // Add new leave request
  const insertMutation = useMutation({
    mutationFn: async (payload: Partial<LeaveRequest>) => {
      // Fix: va passato user_id obbligatorio per policy!
      const { error, data } = await supabase
        .from("leave_requests")
        .insert([
          {
            ...payload,
            user_id: payload.user_id,
          },
        ])
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as LeaveRequest;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave_requests"] }),
  });

  // Approve/reject request (admin)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_note
    }: { id: string; status: "approved" | "rejected"; admin_note?: string }) => {
      const { error, data } = await supabase
        .from("leave_requests")
        .update({
          status,
          admin_note,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as LeaveRequest;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave_requests"] }),
  });

  return {
    isLoading,
    leaveRequests: data,
    error,
    insertMutation,
    updateStatusMutation,
  };
}
