import React from "react";
import clsx from "clsx";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
  error?: boolean;
}

export default function Label({ 
  className, 
  children, 
  required = false,
  error = false,
  ...rest 
}: LabelProps) {
  return (
    <label
      className={clsx(
        "block text-sm font-medium",
        error ? "text-red-700" : "text-gray-700",
        className
      )}
      {...rest}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
