import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/account/gtm
 *
 * Returns the client's GTM container info (public ID + install snippets).
 * Used by the onboarding success page and dashboard settings.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.clientAccount.findUnique({
    where: { userId: session.user.id },
    select: {
      gtmPublicId: true,
      gtmSnippetHead: true,
      gtmSnippetBody: true,
    },
  });

  if (!account) {
    return NextResponse.json(
      { error: "No client account found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    gtmPublicId: account.gtmPublicId,
    gtmSnippetHead: account.gtmSnippetHead,
    gtmSnippetBody: account.gtmSnippetBody,
  });
}
