import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const requests = await prisma.changeRequest.findMany({
    include: {
      user: { select: { name: true, email: true } },
      clientAccount: {
        include: {
          onboarding: { select: { businessName: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const result = requests.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    priority: r.priority,
    status: r.status,
    adminNotes: r.adminNotes,
    clientName: r.user.name || r.user.email,
    businessName: r.clientAccount.onboarding?.businessName || "N/A",
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  }));

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { id, status, adminNotes } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const updated = await prisma.changeRequest.update({
    where: { id },
    data: {
      status,
      adminNotes: adminNotes || undefined,
      resolvedAt: ["COMPLETED", "REJECTED"].includes(status) ? new Date() : null,
      resolvedBy: ["COMPLETED", "REJECTED"].includes(status) ? session.user.id : null,
    },
  });

  return NextResponse.json(updated);
}
