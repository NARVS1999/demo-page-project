"use client";

import Link from "next/link";
import { Label } from "@/components/ui/label";

const statuses = [
  ["all", "All orders"],
  ["paid", "Paid"],
  ["preparing", "Preparing"],
  ["ready", "Ready"],
  ["cancelled", "Cancelled"],
] as const;

export function OrderFilters({ current, order }: { current: string; order?: string | null }) {
  return (
    <form
      method="GET"
      action="/admin/orders"
      aria-label="Order filters"
      className="flex flex-wrap items-end gap-4 border-b border-border bg-card px-4 py-3"
    >
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <Label htmlFor="order-status">Status</Label>
        <select
          id="order-status"
          name="status"
          defaultValue={current}
          onChange={(event) => event.currentTarget.form?.submit()}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:[color-scheme:dark] sm:w-auto"
        >
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {(current !== "all" || order) && (
        <Link href="/admin/orders" className="h-10 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
          Clear filters
        </Link>
      )}
    </form>
  );
}
