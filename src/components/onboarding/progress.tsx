"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  slug: string;
  title: string;
}

export function OnboardingProgress({ steps }: { steps: readonly Step[] }) {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop();
  const currentStep = steps.find((s) => s.slug === currentSlug)?.number ?? 1;

  return (
    <div className="flex items-center gap-2">
      {steps.map((step) => (
        <div key={step.number} className="flex items-center gap-2 flex-1">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
              step.number < currentStep && "bg-primary text-primary-foreground",
              step.number === currentStep && "bg-primary text-primary-foreground",
              step.number > currentStep && "bg-muted text-muted-foreground"
            )}
          >
            {step.number < currentStep ? "✓" : step.number}
          </div>
          {step.number < steps.length && (
            <div
              className={cn(
                "h-0.5 flex-1",
                step.number < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
