import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "glass" | "gradient";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, padding = "md", variant = "default", children, ...props }, ref) => {
    const paddingClasses = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    const variants = {
      default: "bg-white border border-gray-200 shadow-sm",
      glass: "glass-card",
      gradient: "gradient-border",
    };

    const baseClasses = cn(
      "rounded-2xl transition-all duration-300",
      variants[variant],
      paddingClasses[padding],
      hover && "card-hover",
      className
    );

    if (variant === "gradient") {
      return (
        <div className={baseClasses} ref={ref} {...props}>
          <div className="gradient-border-content">
            {children}
          </div>
        </div>
      );
    }

    return (
      <div className={baseClasses} ref={ref} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
