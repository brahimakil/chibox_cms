"use client";

interface SpecificationsTableProps {
  /** product_props is a JSON string containing an array of single-key objects, e.g. [{"Brand":"Nike"},{"Material":"Cotton"}] */
  productPropsJson: string | null;
}

type PropEntry = { key: string; value: string };

function parseProductProps(json: string | null): PropEntry[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const entries: PropEntry[] = [];
    for (const item of parsed) {
      if (typeof item === "object" && item !== null) {
        for (const [key, value] of Object.entries(item)) {
          entries.push({ key, value: String(value ?? "") });
        }
      }
    }
    return entries;
  } catch {
    return [];
  }
}

export function SpecificationsTable({
  productPropsJson,
}: SpecificationsTableProps) {
  const props = parseProductProps(productPropsJson);

  if (props.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No specifications available.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      {props.map((entry, i) => (
        <div
          key={`${entry.key}-${i}`}
          className={`flex text-sm ${
            i % 2 === 0 ? "bg-muted/20" : "bg-card"
          } ${i < props.length - 1 ? "border-b" : ""}`}
        >
          <span className="w-2/5 flex-shrink-0 px-3 py-2 font-medium text-muted-foreground">
            {entry.key}
          </span>
          <span className="flex-1 px-3 py-2 text-foreground break-all">
            {entry.value || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
