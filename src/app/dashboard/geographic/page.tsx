"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker, type DateRange } from "@/components/dashboard/date-range-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GeoRow {
  locationName: string;
  locationType: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpa: number;
}

export default function GeographicPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [data, setData] = useState<GeoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/metrics/geographic?range=${dateRange}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Geographic Performance</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No geographic data available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.locationName}>
                    <TableCell className="font-medium">
                      {row.locationName}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {row.locationType}
                    </TableCell>
                    <TableCell className="text-right">
                      ${row.spend.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.clicks.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.impressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.ctr.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {row.conversions.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.cpa > 0 ? `$${row.cpa.toFixed(2)}` : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
