"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GtmData {
  gtmPublicId: string | null;
  gtmSnippetHead: string | null;
  gtmSnippetBody: string | null;
}

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const [gtmData, setGtmData] = useState<GtmData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedHead, setCopiedHead] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    async function fetchGtm() {
      try {
        const res = await fetch("/api/account/gtm");
        if (res.ok) {
          const data = await res.json();
          setGtmData(data);
          if (data.gtmPublicId) {
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Ignore fetch errors during polling
      }

      // If GTM not ready yet, poll a few more times
      if (pollCount < 10) {
        setTimeout(() => setPollCount((c) => c + 1), 3000);
      } else {
        setIsLoading(false);
      }
    }

    fetchGtm();
  }, [pollCount]);

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

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="text-3xl font-bold">You&apos;re all set!</h1>
        <p className="text-muted-foreground text-lg">
          Your subscription is active and our team will start building your
          campaigns. In the meantime, install your tracking code.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">
              Setting up your tracking container...
            </span>
          </CardContent>
        </Card>
      ) : gtmData?.gtmPublicId ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Google Tag Manager</span>
                <span className="text-sm font-mono bg-muted px-3 py-1 rounded">
                  {gtmData.gtmPublicId}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Add these code snippets to your website to enable conversion
                tracking. You can also find these in your dashboard settings
                anytime.
              </p>

              {gtmData.gtmSnippetHead && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Paste in the{" "}
                      <code className="bg-muted px-1 rounded">&lt;head&gt;</code>{" "}
                      of your website:
                    </p>
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
                    <p className="text-sm font-medium">
                      Paste after the opening{" "}
                      <code className="bg-muted px-1 rounded">&lt;body&gt;</code>{" "}
                      tag:
                    </p>
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
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Your tracking container is being set up. You&apos;ll find the
              install code in your dashboard settings once it&apos;s ready.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button size="lg" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
