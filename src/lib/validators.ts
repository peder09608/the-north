import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ─── Onboarding Step 1: Business Basics ─────────────────────

export const businessBasicsSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  websiteUrl: z.string().url("Please enter a valid URL"),
  industry: z.string().min(1, "Please select an industry"),
  industryOther: z.string().optional(),
  businessDescription: z.string().min(50, "Please provide at least 50 characters"),
});

// ─── Onboarding Step 2: Goals ───────────────────────────────

export const goalsSchema = z.object({
  campaignGoals: z.array(z.string()).min(1, "Select at least one goal"),
  primaryGoal: z.string().min(1, "Please select your primary goal"),
  monthlyLeadTarget: z.number().int().positive().optional().nullable(),
});

// ─── Onboarding Step 3: Geographic Targeting ────────────────

export const targetLocationSchema = z.object({
  type: z.enum(["national", "state", "city", "zip", "radius"]),
  value: z.union([z.string(), z.object({
    lat: z.number(),
    lng: z.number(),
    radiusMiles: z.number(),
  })]),
  label: z.string(),
});

export const targetingSchema = z.object({
  targetingType: z.enum(["national", "state", "city", "zip", "radius"]),
  targetLocations: z.array(targetLocationSchema).min(1, "Add at least one location"),
  excludeLocations: z.array(targetLocationSchema).optional(),
});

// ─── Onboarding Step 4: Keywords ────────────────────────────

export const keywordsSchema = z.object({
  targetKeywords: z.array(z.string()).min(3, "Add at least 3 keywords"),
  negativeKeywords: z.array(z.string()).optional().default([]),
  targetAudience: z.string().optional(),
  competitorNames: z.array(z.string()).optional().default([]),
});

// ─── Onboarding Step 5: Budget ──────────────────────────────

export const budgetSchema = z.object({
  monthlyBudget: z.number().min(500, "Minimum budget is $500").max(50000),
  budgetFlexibility: z.enum(["strict", "flexible_10", "flexible_25"]),
});

// ─── Onboarding Step 6: Ad Copy ─────────────────────────────

export const adCopySchema = z.object({
  uniqueSellingPoints: z.array(z.string().min(1)).min(3, "Provide at least 3 selling points"),
  callsToAction: z.array(z.string()).min(1, "Select at least one CTA"),
  promotions: z.string().optional(),
  landingPageUrl: z.string().url("Please enter a valid URL"),
  phoneNumber: z.string().optional(),
  businessAddress: z.string().optional(),
});

// ─── Onboarding Step 7: Additional ─────────────────────────

export const additionalSchema = z.object({
  previousAdExperience: z.enum(["none", "self_managed", "agency_managed"]).optional(),
  additionalNotes: z.string().optional(),
});

// ─── Change Request ─────────────────────────────────────────

export const changeRequestSchema = z.object({
  type: z.enum([
    "KEYWORD_ADDITION",
    "KEYWORD_REMOVAL",
    "AD_COPY_CHANGE",
    "BUDGET_CHANGE",
    "TARGETING_CHANGE",
    "NEW_CAMPAIGN",
    "PAUSE_CAMPAIGN",
    "OTHER",
  ]),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide more detail"),
  priority: z.enum(["low", "normal", "high"]),
});

// ─── Types ──────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type BusinessBasicsInput = z.infer<typeof businessBasicsSchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;
export type TargetingInput = z.infer<typeof targetingSchema>;
export type KeywordsInput = z.infer<typeof keywordsSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type AdCopyInput = z.infer<typeof adCopySchema>;
export type AdditionalInput = z.infer<typeof additionalSchema>;
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;
