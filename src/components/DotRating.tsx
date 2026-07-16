export function DotRating({ value, max = 5, onChange, size = "md" }: {
  value: number;
  max?: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  const editable = !!onChange;
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={!editable}
            onClick={() => onChange?.(i + 1 === value ? i : i + 1)}
            className={`${dim} rounded-full border transition-all ${
              filled ? "bg-blood border-blood" : "bg-transparent border-ash/50"
            } ${editable ? "cursor-pointer hover:border-blood" : "cursor-default"}`}
            aria-label={`${i + 1}${filled ? " (preenchido)" : ""}`}
          />
        );
      })}
    </div>
  );
}
