import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { testMccConnection } from "@/lib/google-ads";

/**
 * GET /api/admin/test-connection
 *
 * Tests the Google Ads API connection by listing accessible customers.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const accessible = await testMccConnection();
    return NextResponse.json({
      success: true,
      mccId: process.env.GOOGLE_ADS_MCC_CUSTOMER_ID,
      accessibleCustomers: accessible,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || String(error),
        details: error.errors?.[0]?.message || null,
      },
      { status: 500 }
    );
  }
}
