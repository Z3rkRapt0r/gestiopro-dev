export interface SickLeaveFormData {
  selectedUserId: string;
  startDate?: Date;
  endDate?: Date;
  notes: string;
  validationError: string | null;
}

export interface SickLeaveFormProps {
  onSuccess?: () => void;
}