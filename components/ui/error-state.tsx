// Error state used by every error.tsx boundary: title, description, optional action.
export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="text-base text-muted-foreground">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
