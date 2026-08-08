export default function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "danger" | "success" | "accent";
}) {
  const valueColor =
    accent === "danger"
      ? "text-danger"
      : accent === "success"
        ? "text-success"
        : accent === "accent"
          ? "text-accent"
          : "text-ink";

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
