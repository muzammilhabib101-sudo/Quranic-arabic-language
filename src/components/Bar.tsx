/** Thin horizontal progress bar. */
export default function Bar({
  percent,
  label,
  className = "",
}: {
  percent: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${className}`}
    >
      <div
        className="h-full rounded-full bg-accent-2 transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
