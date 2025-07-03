import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";

interface SickLeaveEmployeeSelectorProps {
  selectedUserId: string;
  onEmployeeChange: (userId: string) => void;
}

export function SickLeaveEmployeeSelector({ selectedUserId, onEmployeeChange }: SickLeaveEmployeeSelectorProps) {
  const { employees } = useActiveEmployees();

  return (
    <div className="space-y-2">
      <Label htmlFor="employee">Dipendente *</Label>
      <Select value={selectedUserId} onValueChange={onEmployeeChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleziona un dipendente" />
        </SelectTrigger>
        <SelectContent>
          {employees?.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.first_name} {employee.last_name} ({employee.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}