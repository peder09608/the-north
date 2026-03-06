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
    return NextResponse.json([]);
  }

  const alerts = await prisma.alert.findMany({
    where: {
      clientAccountId: clientAccount.id,
      isDismissed: false,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json(alerts);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { alertId, action } = await request.json();

  if (!alertId || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (action === "dismiss") {
    await prisma.alert.update({
      where: { id: alertId },
      data: { isDismissed: true },
    });
  } else if (action === "read") {
    await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}
