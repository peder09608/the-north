"use client";

import { useState } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { CAMPAIGN_GOALS } from "@/lib/onboarding";
import { StepWrapper } from "@/components/onboarding/step-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function GoalsStep() {
  const { data, isLoading, saveStep } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    data?.campaignGoals || []
  );
  const [primaryGoal, setPrimaryGoal] = useState(data?.primaryGoal || "");
  const [leadTarget, setLeadTarget] = useState<string>(
    data?.monthlyLeadTarget?.toString() || ""
  );
  const [error, setError] = useState<string | null>(null);

  // Sync state when data loads
  if (data && !selectedGoals.length && data.campaignGoals?.length) {
    setSelectedGoals(data.campaignGoals);
    setPrimaryGoal(data.primaryGoal || "");
    setLeadTarget(data.monthlyLeadTarget?.toString() || "");
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) => {
      const next = prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal];
      if (!next.includes(primaryGoal)) setPrimaryGoal("");
      if (next.length === 1) setPrimaryGoal(next[0]);
      return next;
    });
  }

  async function onSubmit() {
    if (selectedGoals.length === 0) {
      setError("Select at least one goal");
      return;
    }
    if (!primaryGoal) {
      setError("Please select your primary goal");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveStep(2, {
        campaignGoals: selectedGoals,
        primaryGoal,
        monthlyLeadTarget: leadTarget ? parseInt(leadTarget) : null,
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
      title="What do you want to achieve?"
      description="Select all that apply. We'll optimize your campaigns around your primary goal."
      currentStep={2}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          {CAMPAIGN_GOALS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              onClick={() => toggleGoal(goal.value)}
              className={cn(
                "flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
                selectedGoals.includes(goal.value)
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              )}
            >
              <span className="font-medium">{goal.label}</span>
              <span className="text-sm text-muted-foreground">
                {goal.description}
              </span>
            </button>
          ))}
        </div>

        {selectedGoals.length > 1 && (
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Which matters most?
            </Label>
            <RadioGroup value={primaryGoal} onValueChange={setPrimaryGoal}>
              {selectedGoals.map((goal) => {
                const info = CAMPAIGN_GOALS.find((g) => g.value === goal);
                return (
                  <div key={goal} className="flex items-center space-x-2">
                    <RadioGroupItem value={goal} id={`primary-${goal}`} />
                    <Label htmlFor={`primary-${goal}`}>{info?.label}</Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        )}

{/* Primary goal auto-set in toggleGoal when only 1 selected */}

        <div className="space-y-2">
          <Label>Monthly lead/conversion target (optional)</Label>
          <Input
            type="number"
            placeholder="e.g. 50"
            value={leadTarget}
            onChange={(e) => setLeadTarget(e.target.value)}
          />
        </div>
      </div>
    </StepWrapper>
  );
}
