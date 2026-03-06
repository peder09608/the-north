"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isPaused, setIsPaused] = useState(false);
  const [budget, setBudget] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [gtmData, setGtmData] = useState<{
    gtmPublicId: string | null;
    gtmSnippetHead: string | null;
    gtmSnippetBody: string | null;
  } | null>(null);
  const [copiedHead, setCopiedHead] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/account/gtm").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([settings, gtm]) => {
        setIsPaused(settings.isPaused || false);
        setBudget(settings.monthlyBudget?.toString() || "");
        if (gtm) setGtmData(gtm);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  function copyToClipboard(text: string, type: "head" | "body") {
    navigator.clipboard.writeText(text);
    if (type === "head") {
      setCopiedHead(true);
      setTimeout(() => setCopiedHead(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  }

  async function handlePauseToggle(checked: boolean) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaused: checked }),
    });

    if (res.ok) {
      setIsPaused(checked);
      toast.success(
        checked
          ? "Campaigns will be paused within 24 hours"
          : "Campaigns will be resumed within 24 hours"
      );
    } else {
      toast.error("Failed to update");
    }
  }

  async function handleBudgetSave() {
    const val = parseFloat(budget);
    if (!budget || val < 500) {
      toast.error("Minimum budget is $500/month");
      return;
    }

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyBudget: val }),
    });

    if (res.ok) {
      toast.success("Budget updated. Changes take effect within 24 hours.");
    } else {
      toast.error("Failed to update budget");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Controls</CardTitle>
          <CardDescription>
            Manage your campaign status and budget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Pause All Campaigns
              </Label>
              <p className="text-sm text-muted-foreground">
                Temporarily stop all your ads from running
              </p>
            </div>
            <Switch checked={isPaused} onCheckedChange={handlePauseToggle} />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base font-medium">Monthly Budget</Label>
            <p className="text-sm text-muted-foreground">
              Budget changes take effect within 24 hours
            </p>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="2000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-36"
                  min={500}
                />
                <span className="text-muted-foreground">/month</span>
              </div>
              <Button onClick={handleBudgetSave}>Update</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={session?.user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={session?.user?.name || ""} disabled />
          </div>
        </CardContent>
      </Card>

      {gtmData?.gtmPublicId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tracking Code</span>
              <span className="text-sm font-mono bg-muted px-3 py-1 rounded">
                {gtmData.gtmPublicId}
              </span>
            </CardTitle>
            <CardDescription>
              Install these snippets on your website to enable conversion tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {gtmData.gtmSnippetHead && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Paste in{" "}
                    <code className="bg-muted px-1 rounded text-xs">
                      &lt;head&gt;
                    </code>
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(gtmData.gtmSnippetHead!, "head")
                    }
                  >
                    {copiedHead ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedHead ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                  {gtmData.gtmSnippetHead}
                </pre>
              </div>
            )}

            {gtmData.gtmSnippetBody && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Paste after opening{" "}
                    <code className="bg-muted px-1 rounded text-xs">
                      &lt;body&gt;
                    </code>
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(gtmData.gtmSnippetBody!, "body")
                    }
                  >
                    {copiedBody ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedBody ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                  {gtmData.gtmSnippetBody}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
