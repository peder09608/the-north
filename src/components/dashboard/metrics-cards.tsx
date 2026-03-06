"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, MousePointer, Eye, Target, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricsSummary {
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  cpa: number;
  // Period-over-period changes (percentage)
  spendChange?: number;
  clicksChange?: number;
  impressionsChange?: number;
  ctrChange?: number;
  conversionsChange?: number;
  cpaChange?: number;
}

function ChangeIndicator({ value, inverse }: { value?: number; inverse?: boolean }) {
  if (value === undefined || value === null) return null;
  // For CPA, lower is better (inverse)
  const isPositive = inverse ? value < 0 : value > 0;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isPositive ? "text-green-600" : "text-red-600"
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function MetricsCards({ data }: { data: MetricsSummary }) {
  const cards = [
    {
      title: "Spend",
      value: `$${data.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: data.spendChange,
      icon: DollarSign,
    },
    {
      title: "Clicks",
      value: data.clicks.toLocaleString(),
      change: data.clicksChange,
      icon: MousePointer,
    },
    {
      title: "Impressions",
      value: data.impressions.toLocaleString(),
      change: data.impressionsChange,
      icon: Eye,
    },
    {
      title: "CTR",
      value: `${data.ctr.toFixed(2)}%`,
      change: data.ctrChange,
      icon: Target,
    },
    {
      title: "Conversions",
      value: data.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 }),
      change: data.conversionsChange,
      icon: Target,
    },
    {
      title: "Cost/Conversion",
      value: `$${data.cpa.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: data.cpaChange,
      icon: DollarSign,
      inverse: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
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
            <ChangeIndicator value={card.change} inverse={card.inverse} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
