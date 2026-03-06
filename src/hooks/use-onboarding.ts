"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface OnboardingData {
  businessName?: string;
  websiteUrl?: string;
  industry?: string;
  industryOther?: string;
  businessDescription?: string;
  campaignGoals?: string[];
  primaryGoal?: string;
  monthlyLeadTarget?: number | null;
  targetingType?: string;
  targetLocations?: Array<{ type: string; value: string; label: string }>;
  excludeLocations?: Array<{ type: string; value: string; label: string }>;
  targetKeywords?: string[];
  negativeKeywords?: string[];
  targetAudience?: string;
  competitorNames?: string[];
  monthlyBudget?: number;
  budgetFlexibility?: string;
  uniqueSellingPoints?: string[];
  callsToAction?: string[];
  promotions?: string;
  landingPageUrl?: string;
  phoneNumber?: string;
  businessAddress?: string;
  previousAdExperience?: string;
  additionalNotes?: string;
  currentStep?: number;
}

export function useOnboarding() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const saveStep = useCallback(
    async (step: number, stepData: Partial<OnboardingData>) => {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data: stepData }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const updated = await res.json();
      setData(updated);

      const stepSlugs = [
        "business",
        "goals",
        "targeting",
        "keywords",
        "budget",
        "ad-copy",
        "review",
      ];

      if (step < 7) {
        router.push(`/onboarding/${stepSlugs[step]}`);
      }
    },
    [router]
  );

  const completeOnboarding = useCallback(async () => {
    // 1. Mark onboarding as complete
    const res = await fetch("/api/onboarding", { method: "POST" });
    if (!res.ok) throw new Error("Failed to complete onboarding");

    // 2. Create Stripe Checkout session and redirect to payment
    const checkoutRes = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnContext: "onboarding" }),
    });

    if (checkoutRes.ok) {
      const { url } = await checkoutRes.json();
      if (url) {
        window.location.href = url;
        return;
      }
    }

    // Fallback: if checkout fails, go to dashboard
    router.push("/dashboard");
    router.refresh();
  }, [router]);

  return { data, isLoading, saveStep, completeOnboarding };
}
