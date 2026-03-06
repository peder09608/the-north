import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changeRequestSchema } from "@/lib/validators";

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

  const requests = await prisma.changeRequest.findMany({
    where: { clientAccountId: clientAccount.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = changeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const clientAccount = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!clientAccount) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  const changeRequest = await prisma.changeRequest.create({
    data: {
      clientAccountId: clientAccount.id,
      userId: session.user.id,
      ...parsed.data,
    },
  });

  return NextResponse.json(changeRequest, { status: 201 });
}
