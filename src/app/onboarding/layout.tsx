import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { OnboardingProgress } from "@/components/onboarding/progress";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">The North</h1>
            <span className="text-sm text-muted-foreground">Account Setup</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <OnboardingProgress steps={ONBOARDING_STEPS} />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
