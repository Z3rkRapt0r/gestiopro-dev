
import { z } from 'zod';

export const leaveRequestSchema = z.object({
  type: z.enum(['ferie', 'permesso']),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  day: z.date().optional(),
  time_from: z.string().optional(),
  time_to: z.string().optional(),
  note: z.string().optional(),
}).refine((data) => {
  if (data.type === 'permesso' && data.day) {
    return data.time_from && data.time_to;
  }
  if (data.type === 'ferie') {
    return data.date_from && data.date_to;
  }
  return true;
}, {
  message: "Compila tutti i campi obbligatori per il tipo di richiesta selezionato",
});

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

export interface LeaveRequestFormProps {
  type?: string;
  onSuccess?: () => void;
}
