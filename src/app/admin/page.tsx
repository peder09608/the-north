"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign, TrendingUp, MessageSquare } from "lucide-react";

interface OverviewData {
  totalClients: number;
  activeClients: number;
  pendingSetupClients: number;
  pendingRequests: number;
  totalSpend30d: number;
  totalRevenue30d: number;
  totalMargin30d: number;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Clients",
      value: data?.totalClients ?? 0,
      subtitle: `${data?.activeClients ?? 0} active, ${data?.pendingSetupClients ?? 0} pending`,
      icon: Users,
    },
    {
      title: "Ad Spend (30d)",
      value: `$${(data?.totalSpend30d ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "Marked up (client-facing)",
      icon: DollarSign,
    },
    {
      title: "Revenue (30d)",
      value: `$${(data?.totalRevenue30d ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "From spend charges",
      icon: TrendingUp,
    },
    {
      title: "Pending Requests",
      value: data?.pendingRequests ?? 0,
      subtitle: "Awaiting review",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${(data?.totalMargin30d ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              From 15% markup on ad spend
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/clients"
              className="block rounded-md border p-3 text-sm hover:bg-muted transition-colors"
            >
              View all clients &rarr;
            </a>
            <a
              href="/admin/requests"
              className="block rounded-md border p-3 text-sm hover:bg-muted transition-colors"
            >
              Review pending requests ({data?.pendingRequests ?? 0}) &rarr;
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
