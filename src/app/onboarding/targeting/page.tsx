"use client";

import { useState } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { US_STATES } from "@/lib/onboarding";
import { StepWrapper } from "@/components/onboarding/step-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

interface LocationTag {
  type: string;
  value: string;
  label: string;
}

export default function TargetingStep() {
  const { data, isLoading, saveStep } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  const [targetingType, setTargetingType] = useState(
    data?.targetingType || ""
  );
  const [locations, setLocations] = useState<LocationTag[]>(
    (data?.targetLocations as LocationTag[]) || []
  );
  const [excludeLocations, setExcludeLocations] = useState<LocationTag[]>(
    (data?.excludeLocations as LocationTag[]) || []
  );
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync state when data loads
  if (data && !targetingType && data.targetingType) {
    setTargetingType(data.targetingType);
    setLocations((data.targetLocations as LocationTag[]) || []);
    setExcludeLocations((data.excludeLocations as LocationTag[]) || []);
  }

  function addLocation(location: LocationTag) {
    if (!locations.find((l) => l.value === location.value)) {
      setLocations([...locations, location]);
    }
  }

  function removeLocation(value: string) {
    setLocations(locations.filter((l) => l.value !== value));
  }

  function handleAddInput() {
    if (!inputValue.trim()) return;

    if (targetingType === "zip") {
      const zips = inputValue.split(",").map((z) => z.trim()).filter(Boolean);
      const newLocations = zips
        .filter((z) => /^\d{5}$/.test(z))
        .map((z) => ({ type: "zip", value: z, label: z }));
      setLocations([
        ...locations,
        ...newLocations.filter(
          (n) => !locations.find((l) => l.value === n.value)
        ),
      ]);
    } else if (targetingType === "city") {
      addLocation({
        type: "city",
        value: inputValue.trim(),
        label: inputValue.trim(),
      });
    }
    setInputValue("");
  }

  async function onSubmit() {
    if (!targetingType) {
      setError("Please select a targeting scope");
      return;
    }
    if (targetingType !== "national" && locations.length === 0) {
      setError("Please add at least one location");
      return;
    }

    setError(null);
    setIsSaving(true);

    const finalLocations =
      targetingType === "national"
        ? [{ type: "national", value: "US", label: "United States" }]
        : locations;

    try {
      await saveStep(3, {
        targetingType,
        targetLocations: finalLocations,
        excludeLocations: excludeLocations.length > 0 ? excludeLocations : undefined,
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
      title="Where are your customers?"
      description="Tell us where you want your ads to show. We can target by state, city, or zip code."
      currentStep={3}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-base font-medium">Targeting Scope</Label>
          <RadioGroup value={targetingType} onValueChange={(v) => { setTargetingType(v); setLocations([]); }}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="national" id="national" />
              <Label htmlFor="national">National (entire US)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="state" id="state" />
              <Label htmlFor="state">By State</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="city" id="city" />
              <Label htmlFor="city">By City / Metro Area</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="zip" id="zip" />
              <Label htmlFor="zip">By Zip Code</Label>
            </div>
          </RadioGroup>
        </div>

        {targetingType === "state" && (
          <div className="space-y-3">
            <Label>Select states</Label>
            <Select onValueChange={(val) => {
              const state = US_STATES.find((s) => s.value === val);
              if (state) addLocation({ type: "state", value: state.value, label: state.label });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Add a state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(targetingType === "city" || targetingType === "zip") && (
          <div className="space-y-3">
            <Label>
              {targetingType === "city"
                ? "Enter city names"
                : "Enter zip codes (comma-separated)"}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={
                  targetingType === "city"
                    ? "e.g. San Francisco, CA"
                    : "e.g. 94102, 94103"
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInput();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddInput}>
                Add
              </Button>
            </div>
          </div>
        )}

        {locations.length > 0 && targetingType !== "national" && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Selected locations
            </Label>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <Badge
                  key={loc.value}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {loc.label}
                  <button
                    type="button"
                    onClick={() => removeLocation(loc.value)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
