import { NextRequest, NextResponse } from "next/server";
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
  });

  if (!clientAccount) {
    return NextResponse.json({ error: "No account" }, { status: 404 });
  }

  return NextResponse.json({
    isPaused: clientAccount.isPaused,
    monthlyBudget: clientAccount.monthlyBudget,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!clientAccount) {
    return NextResponse.json({ error: "No account" }, { status: 404 });
  }

  const body = await request.json();

  const updateData: { isPaused?: boolean; monthlyBudget?: number } = {};

  if (typeof body.isPaused === "boolean") {
    updateData.isPaused = body.isPaused;
  }

  if (typeof body.monthlyBudget === "number" && body.monthlyBudget >= 500 && body.monthlyBudget <= 50000) {
    updateData.monthlyBudget = body.monthlyBudget;
  }

  await prisma.clientAccount.update({
    where: { id: clientAccount.id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
