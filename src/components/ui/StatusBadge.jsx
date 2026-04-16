import { STATUS_COLORS, STATUS_LABELS } from "../shared/constants";

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#6b7280";
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
      style={{
        background: `${color}22`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
