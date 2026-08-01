// Stat card: label (Label role) + value (Display role) + icon in muted circle.
export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border p-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
      </div>
    </div>
  );
}
