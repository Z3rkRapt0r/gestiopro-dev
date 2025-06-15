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

      // Filtro/trasformo profiles: può essere {error: true} se manca!
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
      // Clean the payload: only send relevant fields!
      const {
        user_id,
        type,
        day,
        time_from,
        time_to,
        date_from,
        date_to,
        note,
        status,
      } = payload;
      // Frontend might pass null/undefined, but SQL expects undefined for missing (not null)
      const cleanPayload = {
        user_id: user_id!,
        type: type!,
        day: day ?? null,
        time_from: time_from ?? null,
        time_to: time_to ?? null,
        date_from: date_from ?? null,
        date_to: date_to ?? null,
        note: note ?? null,
        status: status ?? "pending",
      };
      const { error, data } = await supabase
        .from("leave_requests")
        .insert(cleanPayload)
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
    }: { id: string; status: "approved" | "rejected" | "pending"; admin_note?: string }) => {
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

  // Nuovo: update richiesta permesso/ferie completo
  const updateRequestMutation = useMutation({
    mutationFn: async (payload: Partial<LeaveRequest> & { id: string }) => {
      const { id, ...fields } = payload;
      // Pulizia payload solo colonne editabili
      const editableFields = {
        day: fields.day ?? null,
        time_from: fields.time_from ?? null,
        time_to: fields.time_to ?? null,
        date_from: fields.date_from ?? null,
        date_to: fields.date_to ?? null,
        note: fields.note ?? null,
        admin_note: fields.admin_note ?? null,
        status: fields.status,
      } as any;
      // Non inviare field vuoti se edit non admin
      Object.keys(editableFields).forEach(key => {
        if (editableFields[key] === undefined) delete editableFields[key];
      });
      const { error, data } = await supabase
        .from("leave_requests")
        .update(editableFields)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as LeaveRequest;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave_requests"] }),
  });

  // Nuovo: delete richiesta
  const deleteRequestMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave_requests"] }),
  });

  return {
    isLoading,
    leaveRequests: data,
    error,
    insertMutation,
    updateStatusMutation,
    updateRequestMutation,
    deleteRequestMutation,
  };
}
