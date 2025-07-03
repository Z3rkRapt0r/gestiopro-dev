import { format } from "date-fns";

interface SickLeavePreviewProps {
  startDate?: Date;
  endDate?: Date;
}

export function SickLeavePreview({ startDate, endDate }: SickLeavePreviewProps) {
  if (!startDate) return null;

  return (
    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
      📅 Registrerà malattia per: {startDate && endDate 
        ? `dal ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}`
        : format(startDate, 'dd/MM/yyyy')
      }
    </div>
  );
}