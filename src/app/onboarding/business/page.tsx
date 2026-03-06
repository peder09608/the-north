"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { businessBasicsSchema, type BusinessBasicsInput } from "@/lib/validators";
import { useOnboarding } from "@/hooks/use-onboarding";
import { INDUSTRIES } from "@/lib/onboarding";
import { StepWrapper } from "@/components/onboarding/step-wrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessStep() {
  const { data, isLoading, saveStep } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<BusinessBasicsInput>({
    resolver: zodResolver(businessBasicsSchema),
    values: {
      businessName: data?.businessName || "",
      websiteUrl: data?.websiteUrl || "",
      industry: data?.industry || "",
      industryOther: data?.industryOther || "",
      businessDescription: data?.businessDescription || "",
    },
  });

  const selectedIndustry = form.watch("industry");

  async function onSubmit() {
    const valid = await form.trigger();
    if (!valid) return;

    setIsSaving(true);
    try {
      await saveStep(1, form.getValues());
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <StepWrapper
      title="Let's start with your business"
      description="Tell us about your business so we can create ads that represent you accurately."
      currentStep={1}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Plumbing" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {selectedIndustry === "Other" && (
            <FormField
              control={form.control}
              name="industryOther"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specify your industry</FormLabel>
                  <FormControl>
                    <Input placeholder="Your industry" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="businessDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tell us about your business</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what your business does, who you serve, and what makes you different."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </StepWrapper>
  );
}
