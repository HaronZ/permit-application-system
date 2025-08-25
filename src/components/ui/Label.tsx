import React from "react";
import clsx from "clsx";

type Props = React.LabelHTMLAttributes<HTMLLabelElement>;

export default function Label({ className, children, ...rest }: Props) {
  return (
    <label className={clsx("mb-1 block text-sm font-medium text-gray-700", className)} {...rest}>
      {children}
    </label>
  );
}
