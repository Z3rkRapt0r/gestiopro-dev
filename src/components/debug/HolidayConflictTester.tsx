
import React from 'react';
import { format } from 'date-fns';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';
import { useLeaveConflicts } from '@/hooks/useLeaveConflicts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const HolidayConflictTester: React.FC = () => {
  const { holidays, isLoading: holidaysLoading, isHoliday, getHolidayName } = useCompanyHolidays();
  const { conflictDates, conflictSummary, isDateDisabled } = useLeaveConflicts('test-user', 'ferie');

  // Date di test specifiche
  const testDates = [
    new Date('2025-07-23'), // Data specifica che dovrebbe essere bloccata
    new Date('2025-12-25'), // Natale (se configurato)
    new Date('2025-01-01'), // Capodanno (se configurato)
    new Date('2025-08-15'), // Ferragosto (se configurato)
  ];

  console.log('🧪 [HOLIDAY-TESTER] Componente di test caricato');
  console.log('🧪 [HOLIDAY-TESTER] Festività caricate:', holidays.length);
  console.log('🧪 [HOLIDAY-TESTER] Conflitti totali:', conflictSummary.totalConflicts);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Test Sistema Anti-Conflitto Festività
          {holidaysLoading && <Badge variant="secondary">Caricamento...</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">📊 Riepilogo Festività</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Festività totali: <Badge>{holidays.length}</Badge></div>
            <div>Conflitti festività: <Badge>{conflictSummary.holidays}</Badge></div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">📅 Lista Festività Configurate</h3>
          <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{holiday.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={holiday.is_recurring ? "default" : "secondary"}>
                    {holiday.is_recurring ? "Ricorrente" : "Specifica"}
                  </Badge>
                  <span className="text-xs text-gray-500">{holiday.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">🧪 Test Date Specifiche</h3>
          <div className="space-y-2">
            {testDates.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const isHolidayResult = isHoliday(date);
              const isDisabledResult = isDateDisabled(date);
              const holidayName = getHolidayName(date);

              return (
                <div key={dateStr} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{format(date, 'dd/MM/yyyy')}</div>
                    {holidayName && <div className="text-sm text-gray-600">{holidayName}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={isHolidayResult ? "destructive" : "secondary"}>
                      {isHolidayResult ? "Festività" : "Normale"}
                    </Badge>
                    <Badge variant={isDisabledResult ? "destructive" : "default"}>
                      {isDisabledResult ? "BLOCCATA" : "Libera"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">🔍 Test Data Specifica: 23/07/2025</h3>
          <div className="p-4 bg-blue-50 rounded-lg">
            {(() => {
              const testDate = new Date('2025-07-23');
              const isHolidayResult = isHoliday(testDate);
              const isDisabledResult = isDateDisabled(testDate);
              const holidayName = getHolidayName(testDate);

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span>Data:</span>
                    <Badge variant="outline">23/07/2025</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>È festività:</span>
                    <Badge variant={isHolidayResult ? "destructive" : "secondary"}>
                      {isHolidayResult ? "SÌ ✅" : "NO ❌"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>È bloccata:</span>
                    <Badge variant={isDisabledResult ? "destructive" : "secondary"}>
                      {isDisabledResult ? "SÌ ✅" : "NO ❌"}
                    </Badge>
                  </div>
                  {holidayName && (
                    <div className="flex items-center gap-2">
                      <span>Nome:</span>
                      <Badge variant="outline">{holidayName}</Badge>
                    </div>
                  )}
                  {isHolidayResult && isDisabledResult && (
                    <div className="mt-2 p-2 bg-green-100 text-green-800 rounded text-sm">
                      ✅ Test SUPERATO: La data è correttamente identificata come festività e bloccata!
                    </div>
                  )}
                  {isHolidayResult && !isDisabledResult && (
                    <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
                      ⚠️ Test PARZIALE: La data è identificata come festività ma NON è bloccata nei calendari!
                    </div>
                  )}
                  {!isHolidayResult && (
                    <div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-sm">
                      ❌ Test FALLITO: La data NON è identificata come festività!
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-4">
          Questo componente di debug mostra lo stato del sistema anti-conflitto per le festività.
          Controlla la console del browser per vedere i log dettagliati.
        </div>
      </CardContent>
    </Card>
  );
};
