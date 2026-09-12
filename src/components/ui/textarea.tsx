import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn("min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground", className)} {...props} />;
}
