"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpa: number;
}

export function CampaignTable({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaigns</CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No campaigns yet. Your campaigns will appear here once they&apos;re set up.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">CPA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    {campaign.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        campaign.status === "ENABLED"
                          ? "default"
                          : campaign.status === "PAUSED"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {campaign.status === "ENABLED"
                        ? "Active"
                        : campaign.status === "PAUSED"
                          ? "Paused"
                          : campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${campaign.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.clicks.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.impressions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.conversions.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${campaign.cpa.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
