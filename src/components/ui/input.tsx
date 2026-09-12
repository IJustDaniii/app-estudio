import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground disabled:opacity-50", className)} {...props} />;
}
