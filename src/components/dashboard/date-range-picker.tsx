"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DateRange = "7d" | "30d" | "this_month" | "last_month";

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="this_month">This month</SelectItem>
        <SelectItem value="last_month">Last month</SelectItem>
      </SelectContent>
    </Select>
  );
}
