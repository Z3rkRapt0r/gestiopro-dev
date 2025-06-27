
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGPSValidation } from './useGPSValidation';
import { generateOperationPath, generateReadableId } from '@/utils/italianPathUtils';

export const useAttendanceOperations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { validateLocation } = useGPSValidation();

  const checkInMutation = useMutation({
    mutationFn: async ({ latitude, longitude, isBusinessTrip = false, businessTripId }: { 
      latitude: number; 
      longitude: number; 
      isBusinessTrip?: boolean;
      businessTripId?: string;
    }) => {
      console.log('Check-in con struttura italiana e coordinate:', { latitude, longitude, isBusinessTrip });

      const gpsValidation = validateLocation(latitude, longitude, isBusinessTrip);
      if (!gpsValidation.isValid) {
        throw new Error(gpsValidation.message || 'Posizione non valida');
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const checkInTime = now.toTimeString().slice(0, 5);
      
      // Genera il path organizzativo italiano
      const operationType = isBusinessTrip ? 'viaggio_lavoro' : 'presenza_normale';
      const operationPath = await generateOperationPath(operationType, user?.id!, now);
      const readableId = generateReadableId(operationType, now, user?.id!);

      console.log('Path organizzativo italiano per check-in:', {
        operationPath,
        readableId,
        operationType
      });
      
      const { data: existingAttendance } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today)
        .single();

      if (existingAttendance) {
        throw new Error('Hai già registrato la presenza per oggi');
      }

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendances')
        .upsert({
          user_id: user?.id,
          date: today,
          check_in_time: now.toISOString(),
          check_in_latitude: latitude,
          check_in_longitude: longitude,
          is_business_trip: isBusinessTrip,
          business_trip_id: businessTripId,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (attendanceError) throw attendanceError;

      const { data: unifiedData, error: unifiedError } = await supabase
        .from('unified_attendances')
        .upsert({
          user_id: user?.id,
          date: today,
          check_in_time: checkInTime,
          is_manual: false,
          is_business_trip: isBusinessTrip,
          notes: readableId,
          created_by: user?.id,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (unifiedError) throw unifiedError;

      console.log('Check-in completato nella struttura italiana');
      return { attendanceData, unifiedData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Check-in effettuato",
        description: "Il tuo check-in è stato registrato nella struttura organizzativa italiana",
      });
    },
    onError: (error: any) => {
      console.error('Check-in error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il check-in",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const checkOutTime = now.toTimeString().slice(0, 5);
      
      console.log('Check-out con struttura italiana');
      
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendances')
        .update({
          check_out_time: now.toISOString(),
          check_out_latitude: latitude,
          check_out_longitude: longitude,
        })
        .eq('user_id', user?.id)
        .eq('date', today)
        .select()
        .single();

      if (attendanceError) throw attendanceError;

      const { data: unifiedData, error: unifiedError } = await supabase
        .from('unified_attendances')
        .update({
          check_out_time: checkOutTime,
        })
        .eq('user_id', user?.id)
        .eq('date', today)
        .select()
        .single();

      if (unifiedError) throw unifiedError;

      console.log('Check-out completato nella struttura italiana');
      return { attendanceData, unifiedData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Check-out effettuato",
        description: "Il tuo check-out è stato registrato nella struttura organizzativa italiana",
      });
    },
    onError: (error: any) => {
      console.error('Check-out error:', error);
      toast({
        title: "Errore",
        description: "Errore durante il check-out",
        variant: "destructive",
      });
    },
  });

  return {
    checkIn: checkInMutation.mutate,
    checkOut: checkOutMutation.mutate,
    isCheckingIn: checkInMutation.isPending,
    isCheckingOut: checkOutMutation.isPending,
  };
};
