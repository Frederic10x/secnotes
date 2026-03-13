interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  className?: string;
}

export function ProgressBar({ value, color = "#6366F1", className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`w-full h-1 rounded-full overflow-hidden${className ? ` ${className}` : ""}`}
      style={{ backgroundColor: "var(--progress-track)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
