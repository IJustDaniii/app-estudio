import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.ComponentProps<"select">) { return <select className={cn("h-10 w-full rounded-lg border border-input bg-background px-3 text-sm", className)} {...props} />; }
