import React from "react";
import clsx from "clsx";
import { CheckCircle, Clock, AlertCircle, XCircle, Package } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const statusConfig = {
    submitted: {
      label: "Submitted",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Clock,
      iconColor: "text-blue-500",
    },
    under_review: {
      label: "Under Review",
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: AlertCircle,
      iconColor: "text-yellow-500",
    },
    approved: {
      label: "Approved",
      color: "bg-green-50 text-green-700 border-green-200",
      icon: CheckCircle,
      iconColor: "text-green-500",
    },
    ready_for_pickup: {
      label: "Ready for Pickup",
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: Package,
      iconColor: "text-purple-500",
    },
    rejected: {
      label: "Rejected",
      color: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
      iconColor: "text-red-500",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200",
        config.color,
        sizeClasses[size]
      )}
    >
      <Icon className={clsx(iconSizes[size], config.iconColor)} />
      <span>{config.label}</span>
    </div>
  );
}
