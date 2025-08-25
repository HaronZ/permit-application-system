import React from "react";
import clsx from "clsx";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export default function Input({ className, error, ...rest }: Props) {
  return (
    <div>
      <input
        className={clsx(
          "w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2",
          error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-600",
          className
        )}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
