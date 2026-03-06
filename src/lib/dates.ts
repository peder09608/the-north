import { subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export type DateRange = "7d" | "30d" | "this_month" | "last_month";

export function getDateRange(range: DateRange): { start: Date; end: Date } {
  const now = new Date();

  switch (range) {
    case "7d":
      return { start: subDays(now, 7), end: now };
    case "30d":
      return { start: subDays(now, 30), end: now };
    case "this_month":
      return { start: startOfMonth(now), end: now };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    default:
      return { start: subDays(now, 30), end: now };
  }
}

/**
 * Get the previous period for comparison (same length, before the start date).
 */
export function getPreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const durationMs = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - durationMs),
    end: new Date(start.getTime() - 1),
  };
}
