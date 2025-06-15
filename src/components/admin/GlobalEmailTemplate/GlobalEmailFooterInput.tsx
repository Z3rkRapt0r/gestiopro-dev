
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import React from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  loading: boolean;
  initialLoading: boolean;
}

export const GlobalEmailFooterInput: React.FC<Props> = ({
  value,
  onChange,
  loading,
  initialLoading,
}) => (
  <div>
    <Label htmlFor="footer-template">Testo Footer Personalizzato:</Label>
    <Input
      id="footer-template"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={loading || initialLoading}
    />
  </div>
);
