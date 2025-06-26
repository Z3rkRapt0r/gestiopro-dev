
import MultiEmployeeManualAttendanceForm from './MultiEmployeeManualAttendanceForm';
import ManualAttendancesList from './ManualAttendancesList';

export default function ManualAttendanceSection() {
  return (
    <div className="space-y-6">
      <MultiEmployeeManualAttendanceForm />
      <ManualAttendancesList />
    </div>
  );
}
