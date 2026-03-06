"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/hooks/use-onboarding";
import { StepWrapper } from "@/components/onboarding/step-wrapper";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil } from "lucide-react";

function SectionHeader({
  title,
  editHref,
}: {
  title: string;
  editHref: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold">{title}</h3>
      <button
        type="button"
        onClick={() => router.push(editHref)}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}:</span>{" "}
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default function ReviewStep() {
  const { data, isLoading, completeOnboarding } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit() {
    setIsSaving(true);
    try {
      await completeOnboarding();
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  const locations = (data.targetLocations || []) as Array<{
    type: string;
    label: string;
  }>;

  return (
    <StepWrapper
      title="Review your information"
      description="Look everything over. You can go back to edit any section, or submit to get started."
      currentStep={7}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
      isLastStep
    >
      <div className="space-y-6">
        {/* Business Basics */}
        <div className="space-y-2">
          <SectionHeader
            title="Business Basics"
            editHref="/onboarding/business"
          />
          <Field label="Business" value={data.businessName} />
          <Field label="Website" value={data.websiteUrl} />
          <Field
            label="Industry"
            value={
              data.industry === "Other"
                ? data.industryOther
                : data.industry
            }
          />
          <Field label="Description" value={data.businessDescription} />
        </div>

        <Separator />

        {/* Goals */}
        <div className="space-y-2">
          <SectionHeader title="Campaign Goals" editHref="/onboarding/goals" />
          <div className="flex flex-wrap gap-2">
            {data.campaignGoals?.map((goal) => (
              <Badge
                key={goal}
                variant={goal === data.primaryGoal ? "default" : "secondary"}
              >
                {goal.replace("_", " ")}
                {goal === data.primaryGoal && " (primary)"}
              </Badge>
            ))}
          </div>
          {data.monthlyLeadTarget && (
            <Field
              label="Monthly target"
              value={`${data.monthlyLeadTarget} leads/conversions`}
            />
          )}
        </div>

        <Separator />

        {/* Targeting */}
        <div className="space-y-2">
          <SectionHeader
            title="Geographic Targeting"
            editHref="/onboarding/targeting"
          />
          <Field label="Scope" value={data.targetingType} />
          {locations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {locations.map((loc, i) => (
                <Badge key={i} variant="secondary">
                  {loc.label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Keywords */}
        <div className="space-y-2">
          <SectionHeader title="Keywords" editHref="/onboarding/keywords" />
          {data.targetKeywords && data.targetKeywords.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">
                Target keywords:
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {data.targetKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {data.negativeKeywords && data.negativeKeywords.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">
                Negative keywords:
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {data.negativeKeywords.map((kw) => (
                  <Badge key={kw} variant="destructive">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Budget */}
        <div className="space-y-2">
          <SectionHeader title="Budget" editHref="/onboarding/budget" />
          <Field
            label="Monthly budget"
            value={
              data.monthlyBudget
                ? `$${data.monthlyBudget.toLocaleString()}/month`
                : undefined
            }
          />
          <Field label="Flexibility" value={data.budgetFlexibility} />
        </div>

        <Separator />

        {/* Ad Copy */}
        <div className="space-y-2">
          <SectionHeader title="Ad Copy" editHref="/onboarding/ad-copy" />
          {data.uniqueSellingPoints && data.uniqueSellingPoints.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">
                Selling points:
              </span>
              <ul className="mt-1 list-disc list-inside text-sm">
                {data.uniqueSellingPoints.map((usp, i) => (
                  <li key={i}>{usp}</li>
                ))}
              </ul>
            </div>
          )}
          {data.callsToAction && data.callsToAction.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.callsToAction.map((cta) => (
                <Badge key={cta} variant="outline">
                  {cta}
                </Badge>
              ))}
            </div>
          )}
          <Field label="Landing page" value={data.landingPageUrl} />
          <Field label="Phone" value={data.phoneNumber} />
        </div>

        <Separator />

        {/* Pricing Summary */}
        <div className="rounded-lg bg-muted p-4 space-y-1">
          <p className="font-medium">Pricing Summary</p>
          <p className="text-sm text-muted-foreground">
            $99/month platform fee + ad spend charged in $300 increments
          </p>
          {data.monthlyBudget && (
            <p className="text-sm text-muted-foreground">
              Estimated monthly total: $
              {(data.monthlyBudget + 99).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          )}
        </div>
      </div>
    </StepWrapper>
  );
}
