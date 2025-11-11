import React, { useState } from 'react';
import { Clock3, Plus, Archive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import OvertimeEntryForm from './OvertimeEntryForm';
import OvertimeArchiveSection from './OvertimeArchiveSection';
import AutomaticOvertimeSummary from './AutomaticOvertimeSummary';
import { useOvertimeArchive } from '@/hooks/useOvertimeArchive';
import { useAutomaticOvertimeSettings } from '@/hooks/useAutomaticOvertimeSettings';

export default function AdminOvertimeSection() {
  const [activeTab, setActiveTab] = useState('entry');
  const { fetchOvertimes } = useOvertimeArchive();
  const { settings, isLoading: isLoadingSettings } = useAutomaticOvertimeSettings();

  const handleOvertimeSuccess = () => {
    // Refresh the archive data after successful entry
    fetchOvertimes();
    // Switch to archive tab to show the new entry
    setActiveTab('archive');
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Clock3 className="w-6 h-6" />
            Gestione Straordinari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-orange-700">
            Registra e gestisci le ore di lavoro straordinario dei dipendenti. 
            Utilizza il tab "Inserimento" per aggiungere nuovi straordinari e "Archivio" per visualizzare lo storico.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entry" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Inserimento
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Archivio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-4">
          <div className={`grid gap-6 ${settings?.enable_auto_overtime_checkin ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
            <OvertimeEntryForm onSuccess={handleOvertimeSuccess} />
            {settings?.enable_auto_overtime_checkin && <AutomaticOvertimeSummary />}
          </div>
        </TabsContent>

        <TabsContent value="archive" className="space-y-4">
          <OvertimeArchiveSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}