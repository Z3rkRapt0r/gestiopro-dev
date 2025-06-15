
import { Button } from "@/components/ui/button";
import { AlignLeft, AlignRight, AlignCenter } from "lucide-react";
import { Label } from "@/components/ui/label";
import React from "react";

interface Props {
  logoAlign: "left" | "right" | "center";
  setLogoAlign: (align: "left" | "right" | "center") => void;
  loading: boolean;
  initialLoading: boolean;
}

export const GlobalEmailLogoAlign: React.FC<Props> = ({
  logoAlign,
  setLogoAlign,
  loading,
  initialLoading,
}) => (
  <div className="w-full md:w-1/2 flex flex-col gap-1">
    <Label>Allineamento logo:</Label>
    <div className="flex gap-2">
      <Button
        size="icon"
        variant={logoAlign === "left" ? "default" : "outline"}
        onClick={() => setLogoAlign("left")}
        type="button"
        title="Allinea a sinistra"
        disabled={loading || initialLoading}
      >
        <AlignLeft />
      </Button>
      <Button
        size="icon"
        variant={logoAlign === "center" ? "default" : "outline"}
        onClick={() => setLogoAlign("center")}
        type="button"
        title="Allinea al centro"
        disabled={loading || initialLoading}
      >
        <AlignCenter />
      </Button>
      <Button
        size="icon"
        variant={logoAlign === "right" ? "default" : "outline"}
        onClick={() => setLogoAlign("right")}
        type="button"
        title="Allinea a destra"
        disabled={loading || initialLoading}
      >
        <AlignRight />
      </Button>
    </div>
  </div>
);
