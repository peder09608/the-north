import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const alerts = await prisma.alert.findMany({
    include: {
      clientAccount: {
        include: {
          onboarding: { select: { businessName: true } },
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const result = alerts.map((a) => ({
    id: a.id,
    severity: a.severity,
    title: a.title,
    message: a.message,
    category: a.category,
    clientName:
      a.clientAccount.onboarding?.businessName || a.clientAccount.user.email,
    isRead: a.isRead,
    createdAt: a.createdAt,
  }));

  return NextResponse.json(result);
}
