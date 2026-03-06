"use client";

import { useState } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { StepWrapper } from "@/components/onboarding/step-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";

export default function BudgetStep() {
  const { data, isLoading, saveStep } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  const [budget, setBudget] = useState(data?.monthlyBudget || 2000);
  const [flexibility, setFlexibility] = useState(
    data?.budgetFlexibility || "strict"
  );
  const [error, setError] = useState<string | null>(null);

  // Sync state when data loads
  if (data && budget === 2000 && data.monthlyBudget && data.monthlyBudget !== 2000) {
    setBudget(data.monthlyBudget);
    setFlexibility(data.budgetFlexibility || "strict");
  }

  const dailyBudget = Math.round(budget / 30);

  async function onSubmit() {
    if (budget < 500) {
      setError("Minimum budget is $500/month");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveStep(5, {
        monthlyBudget: budget,
        budgetFlexibility: flexibility,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <StepWrapper
      title="What's your monthly budget?"
      description="This is your total monthly ad spend. We'll optimize to get the best results within your budget."
      currentStep={5}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
    >
      <div className="space-y-8">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Label className="text-base font-medium">Monthly Ad Budget</Label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">$500</span>
            <Slider
              value={[budget]}
              onValueChange={(v) => setBudget(v[0])}
              min={500}
              max={50000}
              step={budget < 5000 ? 100 : 500}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">$50k</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              min={500}
              max={50000}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="text-sm text-muted-foreground">
            ~${dailyBudget}/day estimated daily budget
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">Budget Flexibility</Label>
          <RadioGroup value={flexibility} onValueChange={setFlexibility}>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="strict" id="strict" className="mt-1" />
              <div>
                <Label htmlFor="strict" className="font-medium">
                  Strict
                </Label>
                <p className="text-sm text-muted-foreground">
                  Stay within this budget exactly
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem
                value="flexible_10"
                id="flexible_10"
                className="mt-1"
              />
              <div>
                <Label htmlFor="flexible_10" className="font-medium">
                  Flexible
                </Label>
                <p className="text-sm text-muted-foreground">
                  Okay to go up to 10% over if performance is strong
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem
                value="flexible_25"
                id="flexible_25"
                className="mt-1"
              />
              <div>
                <Label htmlFor="flexible_25" className="font-medium">
                  Very Flexible
                </Label>
                <p className="text-sm text-muted-foreground">
                  Okay to go up to 25% over if performance is strong
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm font-medium">Pricing</p>
          <p className="mt-1 text-sm text-muted-foreground">
            $99/month platform fee + ad spend charged in $300 increments as
            your campaigns run. For a ${budget.toLocaleString()}/month budget,
            your estimated total monthly cost is $
            {(budget + 99).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
            .
          </p>
        </div>
      </div>
    </StepWrapper>
  );
}
