
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UserSelectorProps {
  selectedUser: string;
  onUserChange: (userId: string) => void;
  users: User[];
  loading: boolean;
}

export function UserSelector({ selectedUser, onUserChange, users, loading }: UserSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="user">Dipendente</Label>
      <Select value={selectedUser} onValueChange={onUserChange} disabled={loading}>
        <SelectTrigger>
          <SelectValue placeholder="Seleziona dipendente..." />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.first_name} {user.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && (
        <div className="text-sm text-muted-foreground">Caricamento dipendenti...</div>
      )}
    </div>
  );
}
