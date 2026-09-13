"use client";

import { Paperclip } from "lucide-react";
import type { ContextOptions, ContextSelection } from "@/components/ai/types";
import type { AIAcademicPermissions } from "@/lib/ai/validation";

/**
 * Compatibility wrapper for callers that still render the old picker.
 * Context is automatic now, so this component deliberately has no menu or arrow.
 */
export function ContextPicker({ enabled }: { enabled: boolean; options?: ContextOptions; value?: ContextSelection; permissions?: AIAcademicPermissions; maxItemsPerCategory?: number; uploading?: boolean; onChange?: (value: ContextSelection) => void; onUpload?: (files: FileList) => void }) {
  if (!enabled) return null;
  return <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Paperclip className="size-3.5" />El contexto autorizado se usa automaticamente segun la pregunta.</p>;
}
