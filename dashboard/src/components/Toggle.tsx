export default function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-hairline bg-surface p-4 text-left transition hover:border-accent/50"
    >
      <div>
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <span
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
          checked ? "bg-accent" : "bg-hairline"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
