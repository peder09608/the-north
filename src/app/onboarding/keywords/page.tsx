"use client";

import { useState } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { KEYWORD_SUGGESTIONS } from "@/lib/onboarding";
import { StepWrapper } from "@/components/onboarding/step-wrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Plus } from "lucide-react";

export default function KeywordsStep() {
  const { data, isLoading, saveStep } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  const [keywords, setKeywords] = useState<string[]>(
    data?.targetKeywords || []
  );
  const [negativeKeywords, setNegativeKeywords] = useState<string[]>(
    data?.negativeKeywords || []
  );
  const [audience, setAudience] = useState(data?.targetAudience || "");
  const [competitors, setCompetitors] = useState<string[]>(
    data?.competitorNames || []
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [negativeInput, setNegativeInput] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync state when data loads
  if (data && !keywords.length && data.targetKeywords?.length) {
    setKeywords(data.targetKeywords);
    setNegativeKeywords(data.negativeKeywords || []);
    setAudience(data.targetAudience || "");
    setCompetitors(data.competitorNames || []);
  }

  const suggestions = data?.industry
    ? KEYWORD_SUGGESTIONS[data.industry] || []
    : [];

  function addKeyword() {
    const val = keywordInput.trim().toLowerCase();
    if (val && !keywords.includes(val)) {
      setKeywords([...keywords, val]);
    }
    setKeywordInput("");
  }

  function addNegativeKeyword() {
    const val = negativeInput.trim().toLowerCase();
    if (val && !negativeKeywords.includes(val)) {
      setNegativeKeywords([...negativeKeywords, val]);
    }
    setNegativeInput("");
  }

  function addCompetitor() {
    const val = competitorInput.trim();
    if (val && !competitors.includes(val)) {
      setCompetitors([...competitors, val]);
    }
    setCompetitorInput("");
  }

  async function onSubmit() {
    if (keywords.length < 3) {
      setError("Add at least 3 keywords");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveStep(4, {
        targetKeywords: keywords,
        negativeKeywords,
        targetAudience: audience || undefined,
        competitorNames: competitors,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <StepWrapper
      title="What should your ads show up for?"
      description="Enter the search terms your ideal customers would type into Google."
      currentStep={4}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Target Keywords */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Target Keywords</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. emergency plumber near me"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addKeyword}>
              Add
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">
                Suggested for your industry:
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter((s) => !keywords.includes(s))
                  .map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() =>
                        setKeywords([...keywords, suggestion])
                      }
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                      {suggestion}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                  {kw}
                  <button
                    type="button"
                    onClick={() =>
                      setKeywords(keywords.filter((k) => k !== kw))
                    }
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Negative Keywords */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Negative Keywords{" "}
            <span className="text-muted-foreground font-normal">
              (searches to avoid)
            </span>
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder='e.g. "free", "DIY", "jobs"'
              value={negativeInput}
              onChange={(e) => setNegativeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNegativeKeyword();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addNegativeKeyword}
            >
              Add
            </Button>
          </div>
          {negativeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {negativeKeywords.map((kw) => (
                <Badge key={kw} variant="destructive" className="gap-1 pr-1">
                  {kw}
                  <button
                    type="button"
                    onClick={() =>
                      setNegativeKeywords(
                        negativeKeywords.filter((k) => k !== kw)
                      )
                    }
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label>
            Describe your ideal customer{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            placeholder="e.g. Homeowners aged 30-60 in suburban areas who need urgent plumbing repairs..."
            rows={3}
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </div>

        {/* Competitors */}
        <div className="space-y-3">
          <Label>
            Competitors{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Competitor business name"
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCompetitor();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addCompetitor}>
              Add
            </Button>
          </div>
          {competitors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {competitors.map((c) => (
                <Badge key={c} variant="outline" className="gap-1 pr-1">
                  {c}
                  <button
                    type="button"
                    onClick={() =>
                      setCompetitors(competitors.filter((x) => x !== c))
                    }
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </StepWrapper>
  );
}
