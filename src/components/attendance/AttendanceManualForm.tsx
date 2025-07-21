
import React from 'react';
import ManualAttendanceForm from '@/components/attendance/ManualAttendanceForm';
import { HolidayConflictTester } from '@/components/debug/HolidayConflictTester';

export default function AttendanceManualForm() {
  return (
    <div className="space-y-6">
      <ManualAttendanceForm />
      
      {/* Componente di debug per testare il sistema anti-conflitto */}
      <div className="border-t pt-6">
        <HolidayConflictTester />
      </div>
    </div>
  );
}
