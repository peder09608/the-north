"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Rocket,
  RefreshCw,
  Wifi,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface ClientDetail {
  id: string;
  user: { id: string; email: string; name: string | null; status: string; createdAt: string };
  googleAdsCustomerId: string | null;
  stripeCustomerId: string | null;
  gtmPublicId: string | null;
  monthlyBudget: number | null;
  isPaused: boolean;
  onboarding: Record<string, unknown> | null;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    type: string;
    googleCampaignId: string;
    spend: number;
    rawSpend: number;
    clicks: number;
    conversions: number;
  }>;
  spend30d: number;
  rawSpend30d: number;
  changeRequests: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
  spendCharges: Array<{
    id: string;
    amountCents: number;
    status: string;
    periodStart: string;
    periodEnd: string;
    createdAt: string;
  }>;
  alerts: Array<{
    id: string;
    severity: string;
    title: string;
    message: string;
    createdAt: string;
  }>;
}

const statusOptions = ["ONBOARDING", "PENDING_SETUP", "ACTIVE", "PAUSED", "SUSPENDED"];

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleAdsId, setGoogleAdsId] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setClient(data);
        setGoogleAdsId(data.googleAdsCustomerId || "");
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  async function updateStatus(status: string) {
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setClient((prev) =>
        prev ? { ...prev, user: { ...prev.user, status } } : prev
      );
      toast.success(`Status updated to ${status}`);
    }
  }

  async function saveGoogleAdsId() {
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleAdsCustomerId: googleAdsId }),
    });
    if (res.ok) {
      toast.success("Google Ads Customer ID updated");
    }
  }

  async function setupAccount() {
    setIsSettingUp(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}/setup`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Account setup complete! Customer ID: ${data.customerId}`
        );
        setGoogleAdsId(data.customerId);
        // Refresh client data
        const refreshed = await fetch(`/api/admin/clients/${id}`).then((r) =>
          r.json()
        );
        setClient(refreshed);
      } else {
        toast.error(data.error || "Setup failed");
      }
    } catch (err) {
      toast.error("Setup request failed");
    } finally {
      setIsSettingUp(false);
    }
  }

  async function syncMetrics() {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Synced: ${data.synced.campaignsSynced} campaigns, ${data.synced.dailyMetricsUpserted} daily metrics, ${data.synced.campaignMetricsUpserted} campaign metrics`
        );
        // Refresh client data
        const refreshed = await fetch(`/api/admin/clients/${id}`).then((r) =>
          r.json()
        );
        setClient(refreshed);
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch (err) {
      toast.error("Sync request failed");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!client) {
    return <p className="text-muted-foreground">Client not found.</p>;
  }

  const onboarding = client.onboarding as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {(onboarding?.businessName as string) || client.user.name || client.user.email}
          </h1>
          <p className="text-sm text-muted-foreground">{client.user.email}</p>
        </div>
        <Badge
          variant={client.user.status === "ACTIVE" ? "default" : "secondary"}
          className="ml-auto"
        >
          {client.user.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Spend (30d)</div>
            <div className="text-xl font-bold">
              ${client.spend30d.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">
              Raw: ${client.rawSpend30d.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Monthly Budget</div>
            <div className="text-xl font-bold">
              {client.monthlyBudget
                ? `$${client.monthlyBudget.toLocaleString()}`
                : "--"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Campaigns</div>
            <div className="text-xl font-bold">{client.campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Google Ads ID</div>
            <div className="text-xl font-bold">
              {client.googleAdsCustomerId || "Not linked"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-2 flex-wrap">
                  {statusOptions.map((s) => (
                    <Button
                      key={s}
                      variant={client.user.status === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateStatus(s)}
                    >
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Google Ads Customer ID</Label>
                <div className="flex gap-2">
                  <Input
                    value={googleAdsId}
                    onChange={(e) => setGoogleAdsId(e.target.value)}
                    placeholder="e.g. 123-456-7890"
                    className="w-64"
                  />
                  <Button onClick={saveGoogleAdsId}>Save</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Google Ads Actions</Label>
                <div className="flex gap-2 flex-wrap">
                  {client.user.status === "PENDING_SETUP" && (
                    <Button
                      onClick={setupAccount}
                      disabled={isSettingUp}
                      className="gap-2"
                    >
                      {isSettingUp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Rocket className="h-4 w-4" />
                      )}
                      {isSettingUp
                        ? "Setting up..."
                        : "Setup Google Ads Account"}
                    </Button>
                  )}
                  {client.googleAdsCustomerId && (
                    <Button
                      variant="outline"
                      onClick={syncMetrics}
                      disabled={isSyncing}
                      className="gap-2"
                    >
                      {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {isSyncing ? "Syncing..." : "Sync Metrics"}
                    </Button>
                  )}
                  {client.googleAdsCustomerId && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://ads.google.com/aw/overview?ocid=${client.googleAdsCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-2"
                      >
                        <Wifi className="h-4 w-4" />
                        View in Google Ads
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Google Tag Manager</Label>
                {client.gtmPublicId ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {client.gtmPublicId}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Container provisioned
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No GTM container — will be created automatically after payment
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaigns (30d metrics)</CardTitle>
            </CardHeader>
            <CardContent>
              {client.campaigns.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No campaigns yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Spend (marked up)</TableHead>
                      <TableHead>Raw Spend</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Conversions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{c.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.status === "ENABLED" ? "default" : "secondary"
                            }
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>${c.spend.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          ${c.rawSpend.toFixed(2)}
                        </TableCell>
                        <TableCell>{c.clicks.toLocaleString()}</TableCell>
                        <TableCell>{c.conversions.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Onboarding Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {!onboarding ? (
                <p className="text-muted-foreground text-center py-8">
                  No onboarding data.
                </p>
              ) : (
                <div className="space-y-4 text-sm">
                  {[
                    ["Business Name", onboarding.businessName],
                    ["Website", onboarding.websiteUrl],
                    ["Industry", onboarding.industry],
                    ["Description", onboarding.businessDescription],
                    ["Campaign Goals", (onboarding.campaignGoals as string[])?.join(", ")],
                    ["Primary Goal", onboarding.primaryGoal],
                    ["Monthly Lead Target", onboarding.monthlyLeadTarget],
                    ["Targeting Type", onboarding.targetingType],
                    ["Target Keywords", (onboarding.targetKeywords as string[])?.join(", ")],
                    ["Negative Keywords", (onboarding.negativeKeywords as string[])?.join(", ")],
                    ["Monthly Budget", onboarding.monthlyBudget ? `$${onboarding.monthlyBudget}` : null],
                    ["Budget Flexibility", onboarding.budgetFlexibility],
                    ["USPs", (onboarding.uniqueSellingPoints as string[])?.join("; ")],
                    ["CTAs", (onboarding.callsToAction as string[])?.join(", ")],
                    ["Promotions", onboarding.promotions],
                    ["Landing Page", onboarding.landingPageUrl],
                    ["Phone", onboarding.phoneNumber],
                    ["Address", onboarding.businessAddress],
                  ]
                    .filter(([, v]) => v != null && v !== "")
                    .map(([label, value]) => (
                      <div key={label as string} className="grid grid-cols-3 gap-2">
                        <div className="font-medium text-muted-foreground">
                          {label as string}
                        </div>
                        <div className="col-span-2">{String(value)}</div>
                      </div>
                    ))}

                  {onboarding.targetLocations ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="font-medium text-muted-foreground">
                        Target Locations
                      </div>
                      <div className="col-span-2">
                        {(onboarding.targetLocations as Array<{ label?: string; value?: string }>)
                          .map((l) => l.label || l.value)
                          .join(", ")}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Change Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {client.changeRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No change requests.
                </p>
              ) : (
                <div className="space-y-3">
                  {client.changeRequests.map((r) => (
                    <div key={r.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.title}</span>
                        <Badge
                          variant={
                            r.status === "COMPLETED"
                              ? "default"
                              : r.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {r.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {r.type.replace(/_/g, " ")} &middot;{" "}
                        {format(new Date(r.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spend Charges</CardTitle>
            </CardHeader>
            <CardContent>
              {client.spendCharges.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No charges yet.
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
                    {client.spendCharges.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          ${(c.amountCents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.status === "SUCCEEDED"
                                ? "default"
                                : c.status === "FAILED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.periodStart), "MMM d")} &ndash;{" "}
                          {format(new Date(c.periodEnd), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
