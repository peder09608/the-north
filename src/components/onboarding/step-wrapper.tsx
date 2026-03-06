"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface StepWrapperProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps?: number;
  children: React.ReactNode;
  onSubmit: () => void | Promise<void>;
  isSubmitting?: boolean;
  isLastStep?: boolean;
}

export function StepWrapper({
  title,
  description,
  currentStep,
  children,
  onSubmit,
  isSubmitting = false,
  isLastStep = false,
}: StepWrapperProps) {
  const router = useRouter();

  const stepSlugs = [
    "business",
    "goals",
    "targeting",
    "keywords",
    "budget",
    "ad-copy",
    "review",
  ];

  const prevStep = currentStep > 1 ? stepSlugs[currentStep - 2] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
        <div className="flex justify-between mt-8">
          {prevStep ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/onboarding/${prevStep}`)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isLastStep
                ? "Submit"
                : "Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
