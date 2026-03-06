"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdminRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  adminNotes: string | null;
  clientName: string;
  businessName: string;
  createdAt: string;
  resolvedAt: string | null;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  IN_REVIEW: "default",
  COMPLETED: "outline",
  REJECTED: "destructive",
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/requests")
      .then((res) => res.json())
      .then(setRequests)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/admin/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        adminNotes: activeNotes[id] || undefined,
      }),
    });

    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status, adminNotes: activeNotes[id] || r.adminNotes }
            : r
        )
      );
      toast.success(`Request ${status.toLowerCase().replace("_", " ")}`);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Change Requests</h1>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  const pending = requests.filter((r) =>
    ["PENDING", "IN_REVIEW"].includes(r.status)
  );
  const resolved = requests.filter((r) =>
    ["COMPLETED", "REJECTED"].includes(r.status)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Change Requests</h1>

      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Pending ({pending.length})
          </h2>
          {pending.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{request.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {request.businessName} &middot; {request.clientName} &middot;{" "}
                      {format(new Date(request.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.priority === "high" && (
                      <Badge variant="destructive">High</Badge>
                    )}
                    <Badge variant={statusColors[request.status]}>
                      {request.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">
                      {request.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{request.description}</p>
                <Textarea
                  placeholder="Add notes for the client..."
                  value={activeNotes[request.id] || ""}
                  onChange={(e) =>
                    setActiveNotes((prev) => ({
                      ...prev,
                      [request.id]: e.target.value,
                    }))
                  }
                  rows={2}
                />
                <div className="flex gap-2">
                  {request.status === "PENDING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(request.id, "IN_REVIEW")}
                    >
                      Mark In Review
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => updateStatus(request.id, "COMPLETED")}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => updateStatus(request.id, "REJECTED")}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pending.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No pending requests. All caught up!
            </p>
          </CardContent>
        </Card>
      )}

      {resolved.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Resolved ({resolved.length})
          </h2>
          {resolved.map((request) => (
            <Card key={request.id} className="opacity-75">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{request.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[request.status]}>
                      {request.status}
                    </Badge>
                    <Badge variant="outline">
                      {request.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {request.businessName} &middot;{" "}
                  {format(new Date(request.createdAt), "MMM d, yyyy")}
                  {request.resolvedAt &&
                    ` &middot; Resolved ${format(new Date(request.resolvedAt), "MMM d, yyyy")}`}
                </p>
                {request.adminNotes && (
                  <div className="mt-2 rounded bg-muted p-2 text-sm">
                    {request.adminNotes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
