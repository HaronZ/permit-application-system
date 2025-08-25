type Props = { status: string };

const colorMap: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  ready_for_pickup: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status }: Props) {
  const cls = colorMap[status] || "bg-gray-100 text-gray-800";
  const label = status.replace(/_/g, " ");
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
