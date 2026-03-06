"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MetricsCards, type MetricsSummary } from "@/components/dashboard/metrics-cards";
import { PerformanceChart, type ChartDataPoint } from "@/components/dashboard/performance-chart";
import { CampaignTable, type CampaignRow } from "@/components/dashboard/campaign-table";
import { DateRangePicker, type DateRange } from "@/components/dashboard/date-range-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Info, X } from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    severity: string;
    title: string;
    message: string;
    category: string;
  }>>([]);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setAlerts(data))
      .catch(console.error);
  }, []);

  function dismissAlert(alertId: string) {
    fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, action: "dismiss" }),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [metricsRes, campaignsRes] = await Promise.all([
          fetch(`/api/metrics/overview?range=${dateRange}`),
          fetch(`/api/campaigns?range=${dateRange}`),
        ]);

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data.summary);
          setChartData(data.daily);
        }
        if (campaignsRes.ok) {
          const data = await campaignsRes.json();
          setCampaigns(data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [dateRange]);

  const isPendingSetup = session?.user?.status === "PENDING_SETUP";

  if (isPendingSetup) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Welcome to The North</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold">
              We&apos;re setting up your campaigns
            </h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              Our team is reviewing your information and creating your Google Ads
              campaigns. You&apos;ll receive an email when your dashboard is
              ready. This typically takes 1-2 business days.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                alert.severity === "WARNING"
                  ? "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
                  : alert.severity === "CRITICAL"
                    ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    : "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              }`}
            >
              {alert.severity === "WARNING" || alert.severity === "CRITICAL" ? (
                <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600 dark:text-yellow-400 shrink-0" />
              ) : (
                <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{alert.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {alert.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6"
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[300px]" />
        </div>
      ) : metrics ? (
        <>
          <MetricsCards data={metrics} />
          <PerformanceChart data={chartData} />
          <CampaignTable campaigns={campaigns} />
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No data available yet. Metrics will appear once your campaigns
              start running.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
