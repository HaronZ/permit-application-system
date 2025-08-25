import React from "react";
import clsx from "clsx";

type Props = React.HTMLAttributes<HTMLDivElement>;

export default function Card({ className, children, ...rest }: Props) {
  return (
    <div className={clsx("rounded-lg border bg-white p-5 shadow-sm", className)} {...rest}>
      {children}
    </div>
  );
}
