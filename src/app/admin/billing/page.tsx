"use client";

import { useState, useEffect } from "react";
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

interface ClientBilling {
  id: string;
  businessName: string;
  email: string;
  status: string;
  monthlyBudget: number | null;
  spend30d: number;
  totalCharges: number;
  pendingCharges: number;
  lastChargeDate: string | null;
}

export default function AdminBillingPage() {
  const [clients, setClients] = useState<ClientBilling[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Use the clients endpoint and aggregate billing info client-side
    fetch("/api/admin/clients")
      .then((res) => res.json())
      .then((data: Array<{ id: string; businessName: string | null; email: string; status: string; monthlyBudget: number | null; spend30d: number }>) => {
        setClients(
          data.map((c) => ({
            id: c.id,
            businessName: c.businessName || c.email,
            email: c.email,
            status: c.status,
            monthlyBudget: c.monthlyBudget,
            spend30d: c.spend30d,
            totalCharges: 0,
            pendingCharges: 0,
            lastChargeDate: null,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const totalSpend = clients.reduce((sum, c) => sum + c.spend30d, 0);
  const totalBudget = clients.reduce(
    (sum, c) => sum + (c.monthlyBudget || 0),
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Ad Spend (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totalSpend.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Marked up (client-facing)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Budgets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totalBudget.toLocaleString()}/mo
                </div>
                <p className="text-xs text-muted-foreground">
                  Combined monthly budgets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(clients.filter((c) => c.status === "ACTIVE").length * 99).toLocaleString()}/mo
                </div>
                <p className="text-xs text-muted-foreground">
                  {clients.filter((c) => c.status === "ACTIVE").length} active
                  &times; $99/mo
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Billing Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Spend (30d)</TableHead>
                    <TableHead>Pacing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const pacing =
                      client.monthlyBudget && client.monthlyBudget > 0
                        ? (client.spend30d / client.monthlyBudget) * 100
                        : null;
                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-medium">
                            {client.businessName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {client.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              client.status === "ACTIVE"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {client.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {client.monthlyBudget
                            ? `$${client.monthlyBudget.toLocaleString()}`
                            : "--"}
                        </TableCell>
                        <TableCell>
                          ${client.spend30d.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          {pacing !== null ? (
                            <span
                              className={
                                pacing > 110
                                  ? "text-red-600 font-medium"
                                  : pacing > 90
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }
                            >
                              {pacing.toFixed(0)}%
                            </span>
                          ) : (
                            "--"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
