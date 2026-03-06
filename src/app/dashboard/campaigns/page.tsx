"use client";

import { useState, useEffect } from "react";
import { CampaignTable, type CampaignRow } from "@/components/dashboard/campaign-table";
import { DateRangePicker, type DateRange } from "@/components/dashboard/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/campaigns?range=${dateRange}`)
      .then((res) => res.json())
      .then((data) => setCampaigns(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {isLoading ? (
        <Skeleton className="h-[300px]" />
      ) : (
        <CampaignTable campaigns={campaigns} />
      )}
    </div>
  );
}
