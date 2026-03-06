"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BillingData {
  currentMonthSpend: number;
  accumulatedUncharged: number;
  nextChargeAt: number;
  hasSubscription: boolean;
  hasPaymentMethod: boolean;
  charges: Array<{
    id: string;
    amountCents: number;
    status: string;
    periodStart: string;
    periodEnd: string;
    createdAt: string;
  }>;
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/billing")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubscribe() {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const result = await res.json();
      if (res.ok && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setIsCheckoutLoading(false);
    }
  }

  async function handleManageBilling() {
    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const result = await res.json();
      if (res.ok && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setIsPortalLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="flex gap-2">
          {data?.hasPaymentMethod && (
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={isPortalLoading}
              className="gap-2"
            >
              {isPortalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.hasSubscription ? (
              <>
                <div className="text-2xl font-bold">$99/mo</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default">Active</Badge>
                  <span className="text-sm text-muted-foreground">
                    Platform fee
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">
                  $99/mo
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Subscribe to activate your account
                </p>
                <Button
                  onClick={handleSubscribe}
                  disabled={isCheckoutLoading}
                  className="gap-2"
                >
                  {isCheckoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Subscribe Now
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ad Spend This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data?.currentMonthSpend ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Charged in $300 increments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Until Next Charge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data?.nextChargeAt ?? 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              ${(data?.accumulatedUncharged ?? 0).toFixed(2)} accumulated
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Charge History</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.charges.length ? (
            <p className="text-center text-muted-foreground py-8">
              No charges yet. Your charge history will appear here once your
              campaigns start running.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">
                      ${(charge.amountCents / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          charge.status === "SUCCEEDED"
                            ? "default"
                            : charge.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {charge.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(charge.periodStart), "MMM d")} &ndash;{" "}
                      {format(new Date(charge.periodEnd), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(charge.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
