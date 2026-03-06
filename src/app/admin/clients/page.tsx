"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface ClientRow {
  id: string;
  email: string;
  name: string | null;
  businessName: string | null;
  industry: string | null;
  status: string;
  googleAdsCustomerId: string | null;
  monthlyBudget: number | null;
  isPaused: boolean;
  spend30d: number;
  pendingRequests: number;
  campaignCount: number;
  createdAt: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PENDING_SETUP: "secondary",
  ONBOARDING: "outline",
  PAUSED: "destructive",
  SUSPENDED: "destructive",
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((res) => res.json())
      .then(setClients)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients</h1>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No clients yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {clients.length} client{clients.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Spend (30d)</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="hover:underline"
                      >
                        <div className="font-medium">
                          {client.businessName || client.name || client.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {client.email}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[client.status] || "secondary"}>
                        {client.status.replace("_", " ")}
                      </Badge>
                      {client.isPaused && (
                        <Badge variant="outline" className="ml-1">
                          Paused
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.monthlyBudget
                        ? `$${client.monthlyBudget.toLocaleString()}/mo`
                        : "--"}
                    </TableCell>
                    <TableCell>
                      ${client.spend30d.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{client.campaignCount}</TableCell>
                    <TableCell>
                      {client.pendingRequests > 0 ? (
                        <Badge variant="secondary">
                          {client.pendingRequests} pending
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(client.createdAt), "MMM d, yyyy")}
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
