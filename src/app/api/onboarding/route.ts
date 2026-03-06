import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
    include: { onboarding: true },
  });

  if (!clientAccount?.onboarding) {
    return NextResponse.json({ error: "No onboarding found" }, { status: 404 });
  }

  return NextResponse.json(clientAccount.onboarding);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { step, data } = body;

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
    include: { onboarding: true },
  });

  if (!clientAccount?.onboarding) {
    return NextResponse.json({ error: "No onboarding found" }, { status: 404 });
  }

  // Update onboarding with step data and advance step
  const updated = await prisma.onboardingResponse.update({
    where: { id: clientAccount.onboarding.id },
    data: {
      ...data,
      currentStep: Math.max(clientAccount.onboarding.currentStep, step + 1),
    },
  });

  return NextResponse.json(updated);
}

// Complete onboarding
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
    include: { onboarding: true },
  });

  if (!clientAccount?.onboarding) {
    return NextResponse.json({ error: "No onboarding found" }, { status: 404 });
  }

  // Mark onboarding complete
  await prisma.onboardingResponse.update({
    where: { id: clientAccount.onboarding.id },
    data: {
      completedAt: new Date(),
      currentStep: 8,
    },
  });

  // Update user status and set budget from onboarding
  await prisma.user.update({
    where: { id: session.user.id },
    data: { status: "PENDING_SETUP" },
  });

  await prisma.clientAccount.update({
    where: { id: clientAccount.id },
    data: {
      monthlyBudget: clientAccount.onboarding.monthlyBudget,
    },
  });

  return NextResponse.json({ message: "Onboarding complete" });
}
