
import ManualAttendanceForm from './ManualAttendanceForm';
import ManualAttendancesList from './ManualAttendancesList';

export default function ManualAttendanceSection() {
  return (
    <div className="space-y-6">
      <ManualAttendanceForm />
      <ManualAttendancesList />
    </div>
  );
}
