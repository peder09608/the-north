"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { format } from "date-fns";

interface ChangeRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  IN_REVIEW: "default",
  COMPLETED: "outline",
  REJECTED: "destructive",
};

export default function ChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/change-requests")
      .then((res) => res.json())
      .then((data) => setRequests(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Change Requests</h1>
        <Link href="/dashboard/requests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No change requests yet. Submit a request to suggest changes to
              your campaigns.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{request.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[request.status] || "secondary"}>
                      {request.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">
                      {request.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {request.description}
                </p>
                {request.adminNotes && (
                  <div className="mt-3 rounded bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Response from The North:
                    </p>
                    <p className="text-sm">{request.adminNotes}</p>
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {format(new Date(request.createdAt), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
