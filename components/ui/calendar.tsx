import * as React from "react";

import { cn } from "@/lib/utils";

const Calendar = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="date"
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
        className
      )}
      {...props}
    />
  )
);
Calendar.displayName = "Calendar";

export { Calendar };
