import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

type Props = {
  title: string;
  description?: string;
  actionHref?: string;
  actionText?: string;
};

export default function EmptyState({ title, description, actionHref, actionText }: Props) {
  return (
    <div className="rounded-lg border bg-white p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      {actionHref && actionText && (
        <div className="mt-4 flex justify-center">
          <Link href={actionHref}><Button>{actionText}</Button></Link>
        </div>
      )}
    </div>
  );
}
