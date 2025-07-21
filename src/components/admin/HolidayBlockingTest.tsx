
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';
import { useLeaveConflicts } from '@/hooks/useLeaveConflicts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const HolidayBlockingTest = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { holidays, isHoliday, getHolidayName, isLoading: holidaysLoading } = useCompanyHolidays();
  const { isDateDisabled, getConflictDetailsForDate, isLoading: conflictsLoading } = useLeaveConflicts('test-user', 'ferie');

  const testSpecificDate = () => {
    // Test per il 23 luglio 2025
    const testDate = new Date(2025, 6, 23); // Mese 6 = Luglio (0-based)
    console.log('🧪 TEST SPECIFICO per 23 luglio 2025:');
    console.log('- Data test:', testDate);
    console.log('- È festività?', isHoliday(testDate));
    console.log('- Nome festività:', getHolidayName(testDate));
    console.log('- È disabilitata?', isDateDisabled(testDate));
    console.log('- Conflitti:', getConflictDetailsForDate(testDate));
  };

  const testChristmas = () => {
    // Test per Natale (ricorrente)
    const christmasDate = new Date(2025, 11, 25); // 25 dicembre 2025
    console.log('🧪 TEST NATALE 2025:');
    console.log('- Data test:', christmasDate);
    console.log('- È festività?', isHoliday(christmasDate));
    console.log('- Nome festività:', getHolidayName(christmasDate));
    console.log('- È disabilitata?', isDateDisabled(christmasDate));
    console.log('- Conflitti:', getConflictDetailsForDate(christmasDate));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Test Blocco Festività</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Stato di caricamento */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <h3 className="font-semibold">Stato Caricamento</h3>
            <p>Festività: {holidaysLoading ? '⏳ Caricando...' : '✅ Caricate'}</p>
            <p>Conflitti: {conflictsLoading ? '⏳ Caricando...' : '✅ Calcolati'}</p>
            <p>Festività totali: {holidays.length}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-semibold">Test Rapidi</h3>
            <div className="space-y-2">
              <Button size="sm" onClick={testSpecificDate}>
                Test 23 Luglio 2025
              </Button>
              <Button size="sm" onClick={testChristmas}>
                Test Natale 2025
              </Button>
            </div>
          </div>
        </div>

        {/* Calendario di test */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Calendario con Blocco Festività</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDateDisabled}
              className="rounded-md border"
            />
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">Informazioni Data Selezionata</h3>
            {selectedDate ? (
              <div className="p-4 bg-gray-50 rounded space-y-2">
                <p><strong>Data:</strong> {format(selectedDate, 'dd MMMM yyyy', { locale: it })}</p>
                <p><strong>È festività:</strong> {isHoliday(selectedDate) ? '🎄 SÌ' : '❌ No'}</p>
                <p><strong>Nome festività:</strong> {getHolidayName(selectedDate) || 'N/A'}</p>
                <p><strong>È bloccata:</strong> {isDateDisabled(selectedDate) ? '🚫 SÌ' : '✅ No'}</p>
                
                <div className="mt-4">
                  <strong>Conflitti trovati:</strong>
                  <ul className="mt-2 space-y-1">
                    {getConflictDetailsForDate(selectedDate).map((conflict, index) => (
                      <li key={index} className="text-sm bg-red-100 p-2 rounded">
                        <span className="font-medium">{conflict.type}:</span> {conflict.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Seleziona una data dal calendario</p>
            )}
          </div>
        </div>

        {/* Lista festività caricate */}
        <div>
          <h3 className="font-semibold mb-4">Festività Caricate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="p-2 bg-yellow-50 rounded text-sm">
                <div className="font-medium">{holiday.name}</div>
                <div className="text-gray-600">{holiday.date}</div>
                <div className="text-xs text-gray-500">
                  {holiday.is_recurring ? '🔄 Ricorrente' : '📅 Specifica'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HolidayBlockingTest;
