import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { FolderOpen, Plus, Search } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  variant?: "default" | "search" | "create";
}

export default function EmptyState({
  title,
  description,
  actionHref,
  actionText,
  actionIcon,
  variant = "default",
}: EmptyStateProps) {
  const getIcon = () => {
    if (actionIcon) return actionIcon;
    
    switch (variant) {
      case "search":
        return <Search className="h-12 w-12 text-gray-400" />;
      case "create":
        return <Plus className="h-12 w-12 text-gray-400" />;
      default:
        return <FolderOpen className="h-12 w-12 text-gray-400" />;
    }
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex justify-center">
          {getIcon()}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
        
        {actionHref && actionText && (
          <div className="flex justify-center">
            <Link href={actionHref}>
              <Button leftIcon={actionIcon || <Plus className="h-4 w-4" />}>
                {actionText}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
