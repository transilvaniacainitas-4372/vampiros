export function SquareTrack({
  value,
  max,
  onChange,
  columns = 10,
}: {
  value: number;
  max: number;
  onChange?: (v: number) => void;
  columns?: number;
}) {
  const editable = !!onChange;

  return (
    <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: max }, (_, index) => {
        const filled = index < value;
        return (
          <button
            key={index}
            type="button"
            disabled={!editable}
            onClick={() => onChange?.(index + 1 === value ? index : index + 1)}
            className={`size-3 border transition-colors ${
              filled ? "bg-blood border-blood" : "bg-background/40 border-ash/60"
            } ${editable ? "cursor-pointer hover:border-blood" : "cursor-default"}`}
            aria-label={`${index + 1}${filled ? " marcado" : ""}`}
          />
        );
      })}
    </div>
  );
}
