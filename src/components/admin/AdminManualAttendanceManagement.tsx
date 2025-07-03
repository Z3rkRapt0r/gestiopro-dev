import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ArrowRight } from 'lucide-react';

export default function AdminManualAttendanceManagement() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">⚠️ Sistema Aggiornato</h1>
        <p className="text-muted-foreground">
          La gestione delle presenze è stata migliorata con tabelle dedicate
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Malattie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Le malattie ora hanno una tabella dedicata con controlli di integrità delle date.
            </p>
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <h4 className="font-medium text-green-800 mb-1">✅ Vantaggi:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Niente più problemi di date che saltano</li>
                <li>• Gestione periodo-based (start_date, end_date)</li>
                <li>• Controlli automatici di sovrapposizione</li>
                <li>• Funzioni di verifica integrità</li>
              </ul>
            </div>
            <Button className="w-full" onClick={() => window.location.href = '/admin/sick-leaves'}>
              <Heart className="w-4 h-4 mr-2" />
              Vai alla Gestione Malattie
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-blue-500" />
              Presenze Normali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Le presenze normali restano nel sistema unificato per trasferte e inserimenti manuali.
            </p>
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-1">🔧 In aggiornamento:</h4>
              <p className="text-sm text-blue-700">
                Il modulo per le presenze normali sarà ripristinato dopo aver completato la migrazione delle malattie.
              </p>
            </div>
            <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
              Usa il form dedicato per le malattie nel frattempo
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📋 Riepilogo Migrazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
              Tabella <code>sick_leaves</code> creata con successo
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
              Funzioni di verifica date implementate
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
              Hook <code>useSickLeaves</code> pronto
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
              Form dedicato per malattie funzionante
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <span className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-xs">⟳</span>
              Pulizia riferimenti <code>is_sick_leave</code> in corso
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}