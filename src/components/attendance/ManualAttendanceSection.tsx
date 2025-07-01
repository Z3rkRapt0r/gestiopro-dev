
import MultiEmployeeManualAttendanceForm from './MultiEmployeeManualAttendanceForm';
import ManualAttendancesList from './ManualAttendancesList';

export default function ManualAttendanceSection() {
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Desktop: side-by-side layout for larger screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div className="xl:col-span-1">
          <MultiEmployeeManualAttendanceForm />
        </div>
        <div className="xl:col-span-1">
          <ManualAttendancesList />
        </div>
      </div>
    </div>
  );
}
