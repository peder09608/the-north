"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Alert {
  id: string;
  severity: string;
  title: string;
  message: string;
  category: string;
  clientName: string;
  isRead: boolean;
  createdAt: string;
}

const severityColors: Record<string, "default" | "secondary" | "destructive"> = {
  INFO: "secondary",
  WARNING: "default",
  CRITICAL: "destructive",
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/alerts")
      .then((res) => res.json())
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alerts</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No alerts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{alert.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={severityColors[alert.severity]}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline">{alert.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{alert.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {alert.clientName} &middot;{" "}
                  {format(new Date(alert.createdAt), "MMM d, yyyy h:mm a")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
