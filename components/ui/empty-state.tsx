// Empty state: icon in a 48px muted circle, Heading title, muted body, optional action.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="text-base text-muted-foreground">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
