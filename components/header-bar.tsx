"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MilyLogo from "@/components/mily-logo";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface HeaderBarProps {
  onBack?: () => void;
  right?: ReactNode;
  backHref?: string;
  ariaLabel?: string;
}

export default function HeaderBar({ onBack, right, backHref, ariaLabel = "Volver" }: HeaderBarProps) {
  const router = useRouter();
  const handleBack = () => {
    if (onBack) return onBack();
    if (backHref) router.push(backHref);
  };
  return (
    <header className="p-4 border-b bg-white flex items-center w-full fixed top-0 left-0 z-50">
      {backHref && (
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2" aria-label={ariaLabel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="flex-1 flex justify-center items-center min-w-0">
        <div className="w-24 flex items-center justify-center">
          <MilyLogo className="w-24 h-auto" />
        </div>
      </div>
      <div className="w-10 flex-shrink-0">{right}</div>
    </header>
  );
}
