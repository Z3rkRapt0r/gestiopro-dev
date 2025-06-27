
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive, UserCheck, Stethoscope, Calendar, Clock } from 'lucide-react';
import AttendanceArchiveTab from './AttendanceArchiveTab';
import LeaveArchiveTab from './LeaveArchiveTab';

export default function AttendanceArchiveSection() {
  const [activeTab, setActiveTab] = useState("presenze");

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Archive className="w-8 h-8" />
          Archivi Amministrativi
        </h1>
        <p className="text-muted-foreground">
          Gestisci e consulta tutti gli archivi delle operazioni aziendali
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="presenze" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Presenze
          </TabsTrigger>
          <TabsTrigger value="malattie" className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Malattie
          </TabsTrigger>
          <TabsTrigger value="permessi" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Permessi
          </TabsTrigger>
          <TabsTrigger value="ferie" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Ferie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presenze" className="space-y-6">
          <AttendanceArchiveTab type="presenze" />
        </TabsContent>

        <TabsContent value="malattie" className="space-y-6">
          <AttendanceArchiveTab type="malattie" />
        </TabsContent>

        <TabsContent value="permessi" className="space-y-6">
          <LeaveArchiveTab type="permessi" />
        </TabsContent>

        <TabsContent value="ferie" className="space-y-6">
          <LeaveArchiveTab type="ferie" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
