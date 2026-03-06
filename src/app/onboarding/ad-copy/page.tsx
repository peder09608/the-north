"use client";

import { useState } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { PREDEFINED_CTAS } from "@/lib/onboarding";
import { StepWrapper } from "@/components/onboarding/step-wrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function AdCopyStep() {
  const { data, isLoading, saveStep } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  const [usps, setUsps] = useState<string[]>(
    data?.uniqueSellingPoints?.length
      ? data.uniqueSellingPoints
      : ["", "", ""]
  );
  const [ctas, setCtas] = useState<string[]>(data?.callsToAction || []);
  const [promotions, setPromotions] = useState(data?.promotions || "");
  const [landingPageUrl, setLandingPageUrl] = useState(
    data?.landingPageUrl || data?.websiteUrl || ""
  );
  const [phoneNumber, setPhoneNumber] = useState(data?.phoneNumber || "");
  const [businessAddress, setBusinessAddress] = useState(
    data?.businessAddress || ""
  );
  const [error, setError] = useState<string | null>(null);

  // Sync when data loads
  if (data && usps[0] === "" && data.uniqueSellingPoints?.length) {
    setUsps(data.uniqueSellingPoints);
    setCtas(data.callsToAction || []);
    setPromotions(data.promotions || "");
    setLandingPageUrl(data.landingPageUrl || data.websiteUrl || "");
    setPhoneNumber(data.phoneNumber || "");
    setBusinessAddress(data.businessAddress || "");
  }

  function updateUsp(index: number, value: string) {
    const next = [...usps];
    next[index] = value;
    setUsps(next);
  }

  function addUspField() {
    if (usps.length < 5) setUsps([...usps, ""]);
  }

  function toggleCta(cta: string) {
    setCtas((prev) =>
      prev.includes(cta) ? prev.filter((c) => c !== cta) : [...prev, cta]
    );
  }

  async function onSubmit() {
    const filledUsps = usps.filter((u) => u.trim());
    if (filledUsps.length < 3) {
      setError("Please provide at least 3 selling points");
      return;
    }
    if (ctas.length === 0) {
      setError("Select at least one call to action");
      return;
    }
    if (!landingPageUrl) {
      setError("Landing page URL is required");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveStep(6, {
        uniqueSellingPoints: filledUsps,
        callsToAction: ctas,
        promotions: promotions || undefined,
        landingPageUrl,
        phoneNumber: phoneNumber || undefined,
        businessAddress: businessAddress || undefined,
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
      title="Help us write your ads"
      description="We'll craft your ad copy based on your answers. You can request changes anytime."
      currentStep={6}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* USPs */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            What makes your business stand out?
          </Label>
          <p className="text-sm text-muted-foreground">
            Provide 3-5 unique selling points
          </p>
          {usps.map((usp, i) => (
            <Input
              key={i}
              placeholder={
                [
                  "e.g. 24/7 emergency service",
                  "e.g. Licensed & insured",
                  "e.g. Free estimates",
                  "e.g. 20+ years experience",
                  "e.g. Satisfaction guaranteed",
                ][i]
              }
              value={usp}
              onChange={(e) => updateUsp(i, e.target.value)}
            />
          ))}
          {usps.length < 5 && (
            <button
              type="button"
              onClick={addUspField}
              className="text-sm text-primary hover:underline"
            >
              + Add another
            </button>
          )}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Calls to Action</Label>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_CTAS.map((cta) => (
              <button
                key={cta}
                type="button"
                onClick={() => toggleCta(cta)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  ctas.includes(cta)
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                {cta}
              </button>
            ))}
          </div>
        </div>

        {/* Promotions */}
        <div className="space-y-2">
          <Label>
            Current promotions{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            placeholder="e.g. 10% off for first-time customers, Free consultation this month"
            rows={2}
            value={promotions}
            onChange={(e) => setPromotions(e.target.value)}
          />
        </div>

        {/* Landing Page */}
        <div className="space-y-2">
          <Label>Landing Page URL</Label>
          <Input
            placeholder="https://example.com"
            value={landingPageUrl}
            onChange={(e) => setLandingPageUrl(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Where should ad clicks go? Can be different from your main website.
          </p>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label>
            Phone number{" "}
            <span className="text-muted-foreground">(optional, for call extensions)</span>
          </Label>
          <Input
            type="tel"
            placeholder="(555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label>
            Business address{" "}
            <span className="text-muted-foreground">(optional, for location extensions)</span>
          </Label>
          <Textarea
            placeholder="123 Main St, City, State ZIP"
            rows={2}
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
          />
        </div>
      </div>
    </StepWrapper>
  );
}
