
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Users, UserPlus, Edit, Eye } from 'lucide-react';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import CreateEmployeeForm from './CreateEmployeeForm';
import EditEmployeeForm from './EditEmployeeForm';

export default function AdminEmployeesSection() {
  const { employees, loading } = useActiveEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredEmployees = employees?.filter(employee =>
    `${employee.first_name || ''} ${employee.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleCreateEmployeeSuccess = () => {
    setIsCreateDialogOpen(false);
    // Forza un refresh dei dati
    window.location.reload();
  };

  const handleEditEmployeeSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedEmployee(null);
    // Forza un refresh dei dati
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="text-center py-4">Caricamento dipendenti...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestione Dipendenti</h1>
          <p className="text-muted-foreground">
            Visualizza e gestisci tutti i dipendenti dell'azienda
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Nuovo Dipendente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Aggiungi Nuovo Dipendente</DialogTitle>
            </DialogHeader>
            <CreateEmployeeForm 
              onClose={() => setIsCreateDialogOpen(false)}
              onEmployeeCreated={handleCreateEmployeeSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista Dipendenti
            <Badge variant="outline" className="ml-2">
              {employees?.length || 0} dipendenti
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Cerca dipendente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {!filteredEmployees || filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nessun dipendente trovato con i criteri di ricerca' : 'Nessun dipendente registrato'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.first_name && employee.last_name
                          ? `${employee.first_name} ${employee.last_name}`
                          : 'Nome non disponibile'
                        }
                      </TableCell>
                      <TableCell>{employee.email || 'Email non disponibile'}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-600">
                          Attivo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/admin/documents/${employee.id}`, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Dipendente</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EditEmployeeForm 
              employee={selectedEmployee}
              onClose={() => {
                setIsEditDialogOpen(false);
                setSelectedEmployee(null);
              }}
              onEmployeeUpdated={handleEditEmployeeSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
