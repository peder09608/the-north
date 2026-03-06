"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ChartDataPoint {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
}

const metrics = [
  { key: "spend", label: "Spend", format: (v: number) => `$${v.toFixed(2)}` },
  { key: "clicks", label: "Clicks", format: (v: number) => v.toLocaleString() },
  { key: "impressions", label: "Impressions", format: (v: number) => v.toLocaleString() },
  { key: "conversions", label: "Conversions", format: (v: number) => v.toFixed(1) },
] as const;

export function PerformanceChart({ data }: { data: ChartDataPoint[] }) {
  const [activeMetric, setActiveMetric] = useState<string>("spend");

  const metric = metrics.find((m) => m.key === activeMetric) || metrics[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Performance</CardTitle>
        <Tabs value={activeMetric} onValueChange={setActiveMetric}>
          <TabsList>
            {metrics.map((m) => (
              <TabsTrigger key={m.key} value={m.key} className="text-xs">
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                className="text-xs"
                tickFormatter={(val) =>
                  activeMetric === "spend" ? `$${val}` : val.toLocaleString()
                }
              />
              <Tooltip
                formatter={(value) => [metric.format(Number(value)), metric.label]}
                labelFormatter={(label) => new Date(String(label)).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.1)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
