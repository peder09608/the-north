import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Invalid reset link
          </CardTitle>
          <CardDescription>
            This link is invalid or has expired. Please request a new password
            reset.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href="/forgot-password"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Request new reset link
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return <ResetPasswordForm token={token} />;
}
