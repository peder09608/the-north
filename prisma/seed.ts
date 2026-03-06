import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

// Supabase uses its own CA — allow it
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.alert.deleteMany();
  await prisma.spendCharge.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.campaignDailyMetrics.deleteMany();
  await prisma.dailyMetrics.deleteMany();
  await prisma.geographicMetrics.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.onboardingResponse.deleteMany();
  await prisma.clientAccount.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminHash = await bcrypt.hash("admin1234", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@thenorth.com",
      name: "Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create demo client user
  const clientHash = await bcrypt.hash("demo1234", 12);
  const client = await prisma.user.create({
    data: {
      email: "demo@example.com",
      name: "John Smith",
      passwordHash: clientHash,
      role: "CLIENT",
      status: "ACTIVE",
    },
  });

  const clientAccount = await prisma.clientAccount.create({
    data: {
      userId: client.id,
      googleAdsCustomerId: "123-456-7890",
      googleAdsAccountName: "Smith Plumbing Co",
      stripeCustomerId: "cus_demo_123",
      stripeSubscriptionId: "sub_demo_123",
      monthlyBudget: 3000,
    },
  });

  // Onboarding response (completed)
  await prisma.onboardingResponse.create({
    data: {
      clientAccountId: clientAccount.id,
      businessName: "Smith Plumbing Co",
      websiteUrl: "https://smithplumbing.com",
      industry: "plumbing",
      businessDescription:
        "Full-service plumbing company serving residential and commercial clients in the Dallas-Fort Worth area.",
      campaignGoals: ["leads", "calls"],
      primaryGoal: "leads",
      monthlyLeadTarget: 50,
      targetingType: "city",
      targetLocations: [
        { type: "city", value: "Dallas, TX", label: "Dallas, TX" },
        { type: "city", value: "Fort Worth, TX", label: "Fort Worth, TX" },
        { type: "city", value: "Arlington, TX", label: "Arlington, TX" },
      ],
      excludeLocations: [],
      targetKeywords: [
        "plumber near me",
        "emergency plumbing",
        "plumbing repair",
        "water heater installation",
        "drain cleaning",
        "sewer repair",
      ],
      negativeKeywords: ["DIY", "how to", "free"],
      targetAudience: "Homeowners and property managers needing plumbing services",
      competitorNames: ["Roto-Rooter", "Mr. Rooter"],
      monthlyBudget: 3000,
      budgetFlexibility: "flex_10",
      uniqueSellingPoints: [
        "24/7 emergency service",
        "Licensed and insured",
        "Free estimates",
        "30-day warranty on all work",
      ],
      callsToAction: ["call_now", "get_quote"],
      promotions: "$50 off first service for new customers",
      landingPageUrl: "https://smithplumbing.com",
      phoneNumber: "214-555-0123",
      businessAddress: "1234 Main St, Dallas, TX 75201",
      currentStep: 7,
      completedAt: new Date("2026-01-15"),
    },
  });

  // Create campaigns
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        clientAccountId: clientAccount.id,
        googleCampaignId: "gc_001",
        name: "Smith Plumbing - Search",
        status: "ENABLED",
        campaignType: "SEARCH",
        dailyBudget: 65,
        targetLocations: [
          { type: "city", value: "Dallas, TX" },
          { type: "city", value: "Fort Worth, TX" },
        ],
      },
    }),
    prisma.campaign.create({
      data: {
        clientAccountId: clientAccount.id,
        googleCampaignId: "gc_002",
        name: "Smith Plumbing - Emergency",
        status: "ENABLED",
        campaignType: "SEARCH",
        dailyBudget: 35,
        targetLocations: [{ type: "city", value: "Dallas, TX" }],
      },
    }),
    prisma.campaign.create({
      data: {
        clientAccountId: clientAccount.id,
        googleCampaignId: "gc_003",
        name: "Smith Plumbing - Performance Max",
        status: "PAUSED",
        campaignType: "PERFORMANCE_MAX",
        dailyBudget: 20,
      },
    }),
  ]);

  // Generate 60 days of daily metrics
  const now = new Date();
  const dailyMetricsData = [];
  const campaignMetricsData = [];

  for (let i = 59; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Generate realistic metrics with some variance
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseMult = isWeekend ? 0.7 : 1.0;
    const trend = 1 + (59 - i) * 0.003; // slight upward trend

    const impressions = Math.round(
      (800 + Math.random() * 400) * baseMult * trend
    );
    const clicks = Math.round(impressions * (0.04 + Math.random() * 0.03));
    const costMicros = BigInt(
      Math.round((60 + Math.random() * 40) * baseMult * trend * 1_000_000)
    );
    const conversions = parseFloat(
      (clicks * (0.08 + Math.random() * 0.06)).toFixed(1)
    );
    const conversionValue = parseFloat((conversions * 250).toFixed(2));

    dailyMetricsData.push({
      clientAccountId: clientAccount.id,
      date,
      impressions,
      clicks,
      costMicros,
      conversions,
      conversionValue,
    });

    // Split metrics across campaigns (60% search, 30% emergency, 10% pmax)
    const splits = [
      { campaign: campaigns[0], pct: 0.6 },
      { campaign: campaigns[1], pct: 0.3 },
      { campaign: campaigns[2], pct: 0.1 },
    ];

    for (const split of splits) {
      campaignMetricsData.push({
        campaignId: split.campaign.id,
        date,
        impressions: Math.round(impressions * split.pct),
        clicks: Math.round(clicks * split.pct),
        costMicros: BigInt(
          Math.round(Number(costMicros) * split.pct)
        ),
        conversions: parseFloat((conversions * split.pct).toFixed(1)),
        conversionValue: parseFloat(
          (conversionValue * split.pct).toFixed(2)
        ),
      });
    }
  }

  // Batch insert metrics
  for (const m of dailyMetricsData) {
    await prisma.dailyMetrics.create({ data: m });
  }
  for (const m of campaignMetricsData) {
    await prisma.campaignDailyMetrics.create({ data: m });
  }
  console.log(`Created ${dailyMetricsData.length} daily metrics records`);
  console.log(`Created ${campaignMetricsData.length} campaign metrics records`);

  // Geographic metrics (last 30 days)
  const geoLocations = [
    { type: "city", name: "Dallas", id: "geo_dallas" },
    { type: "city", name: "Fort Worth", id: "geo_ftworth" },
    { type: "city", name: "Arlington", id: "geo_arlington" },
    { type: "city", name: "Plano", id: "geo_plano" },
    { type: "city", name: "Irving", id: "geo_irving" },
  ];
  const geoPcts = [0.4, 0.25, 0.15, 0.12, 0.08];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dayMetric = dailyMetricsData[dailyMetricsData.length - 30 + (29 - i)];

    for (let g = 0; g < geoLocations.length; g++) {
      await prisma.geographicMetrics.create({
        data: {
          clientAccountId: clientAccount.id,
          date,
          locationType: geoLocations[g].type,
          locationName: geoLocations[g].name,
          locationId: geoLocations[g].id,
          impressions: Math.round(dayMetric.impressions * geoPcts[g]),
          clicks: Math.round(dayMetric.clicks * geoPcts[g]),
          costMicros: BigInt(
            Math.round(Number(dayMetric.costMicros) * geoPcts[g])
          ),
          conversions: parseFloat(
            (dayMetric.conversions * geoPcts[g]).toFixed(1)
          ),
        },
      });
    }
  }
  console.log("Created geographic metrics");

  // Spend charges
  await prisma.spendCharge.createMany({
    data: [
      {
        clientAccountId: clientAccount.id,
        amountCents: 30000,
        rawSpendCents: 26549,
        markupCents: 3451,
        stripePaymentIntentId: "pi_demo_001",
        status: "SUCCEEDED",
        periodStart: new Date("2026-01-15"),
        periodEnd: new Date("2026-01-22"),
      },
      {
        clientAccountId: clientAccount.id,
        amountCents: 30000,
        rawSpendCents: 26549,
        markupCents: 3451,
        stripePaymentIntentId: "pi_demo_002",
        status: "SUCCEEDED",
        periodStart: new Date("2026-01-22"),
        periodEnd: new Date("2026-01-29"),
      },
      {
        clientAccountId: clientAccount.id,
        amountCents: 30000,
        rawSpendCents: 26549,
        markupCents: 3451,
        stripePaymentIntentId: "pi_demo_003",
        status: "SUCCEEDED",
        periodStart: new Date("2026-01-29"),
        periodEnd: new Date("2026-02-05"),
      },
      {
        clientAccountId: clientAccount.id,
        amountCents: 30000,
        rawSpendCents: 26549,
        markupCents: 3451,
        stripePaymentIntentId: "pi_demo_004",
        status: "SUCCEEDED",
        periodStart: new Date("2026-02-05"),
        periodEnd: new Date("2026-02-12"),
      },
      {
        clientAccountId: clientAccount.id,
        amountCents: 30000,
        rawSpendCents: 26549,
        markupCents: 3451,
        stripePaymentIntentId: "pi_demo_005",
        status: "SUCCEEDED",
        periodStart: new Date("2026-02-12"),
        periodEnd: new Date("2026-02-19"),
      },
      {
        clientAccountId: clientAccount.id,
        amountCents: 30000,
        rawSpendCents: 26549,
        markupCents: 3451,
        stripePaymentIntentId: "pi_demo_006",
        status: "PENDING",
        periodStart: new Date("2026-02-19"),
        periodEnd: new Date("2026-02-27"),
      },
    ],
  });
  console.log("Created spend charges");

  // Change requests
  await prisma.changeRequest.createMany({
    data: [
      {
        clientAccountId: clientAccount.id,
        userId: client.id,
        type: "KEYWORD_ADDITION",
        title: "Add water heater repair keywords",
        description:
          "Please add keywords related to tankless water heater repair and installation.",
        priority: "normal",
        status: "COMPLETED",
        adminNotes:
          "Added 8 new keywords including 'tankless water heater repair', 'water heater installation near me', etc. Changes are live.",
        resolvedAt: new Date("2026-02-10"),
        resolvedBy: admin.id,
      },
      {
        clientAccountId: clientAccount.id,
        userId: client.id,
        type: "AD_COPY_CHANGE",
        title: "Update spring promotion in ads",
        description:
          "We're running a spring special - $75 off any service over $300. Can we update the ad copy to reflect this?",
        priority: "high",
        status: "IN_REVIEW",
      },
      {
        clientAccountId: clientAccount.id,
        userId: client.id,
        type: "TARGETING_CHANGE",
        title: "Add Frisco to target areas",
        description:
          "We've started serving the Frisco area. Please add Frisco, TX to our geographic targeting.",
        priority: "normal",
        status: "PENDING",
      },
    ],
  });
  console.log("Created change requests");

  // Alerts
  await prisma.alert.createMany({
    data: [
      {
        clientAccountId: clientAccount.id,
        severity: "INFO",
        title: "Campaign performance improving",
        message:
          "Your Search campaign CTR has improved 15% over the last 7 days. Great performance!",
        category: "performance",
      },
      {
        clientAccountId: clientAccount.id,
        severity: "WARNING",
        title: "Budget pacing ahead of schedule",
        message:
          "Your campaigns are spending 12% faster than expected. At this rate, you may exceed your monthly budget by $360.",
        category: "budget",
      },
    ],
  });
  console.log("Created alerts");

  // Create a second client (pending setup) for admin panel testing
  const client2Hash = await bcrypt.hash("demo4567", 12);
  const client2 = await prisma.user.create({
    data: {
      email: "jane@example.com",
      name: "Jane Doe",
      passwordHash: client2Hash,
      role: "CLIENT",
      status: "PENDING_SETUP",
    },
  });
  const clientAccount2 = await prisma.clientAccount.create({
    data: {
      userId: client2.id,
      monthlyBudget: 5000,
    },
  });
  await prisma.onboardingResponse.create({
    data: {
      clientAccountId: clientAccount2.id,
      businessName: "Doe Legal Group",
      websiteUrl: "https://doelegal.com",
      industry: "legal",
      businessDescription: "Family law firm specializing in divorce and custody cases.",
      campaignGoals: ["leads", "traffic"],
      primaryGoal: "leads",
      monthlyLeadTarget: 30,
      targetingType: "state",
      targetLocations: [
        { type: "state", value: "California", label: "California" },
      ],
      targetKeywords: [
        "divorce lawyer",
        "family law attorney",
        "custody lawyer",
      ],
      negativeKeywords: ["free", "pro bono"],
      monthlyBudget: 5000,
      budgetFlexibility: "strict",
      uniqueSellingPoints: [
        "20 years experience",
        "Free consultation",
        "Aggressive representation",
      ],
      callsToAction: ["call_now", "book_consultation"],
      landingPageUrl: "https://doelegal.com",
      phoneNumber: "310-555-0456",
      currentStep: 7,
      completedAt: new Date("2026-02-25"),
    },
  });

  console.log("\nSeed complete!");
  console.log("\nTest accounts:");
  console.log("  Admin:  admin@thenorth.com / admin1234");
  console.log("  Client: demo@example.com / demo1234");
  console.log("  Client: jane@example.com / demo4567 (pending setup)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
