
import { useSickLeaveArchive } from "@/hooks/useSickLeaveArchive";
import SickLeaveArchiveByYear from "./SickLeaveArchiveByYear";

export default function SickLeaveArchiveSection() {
  const { sickLeavesByEmployee, isLoading } = useSickLeaveArchive();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sickLeavesByEmployee.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nessun giorno di malattia trovato nell'archivio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Archivio Malattie</h2>
        <p className="text-muted-foreground">
          Visualizza e gestisci tutti i giorni di malattia registrati per ogni dipendente
        </p>
      </div>

      {sickLeavesByEmployee.map(({ employee, sickLeaves }) => (
        <SickLeaveArchiveByYear 
          key={employee.id}
          employee={employee}
          sickLeaves={sickLeaves}
        />
      ))}
    </div>
  );
}
