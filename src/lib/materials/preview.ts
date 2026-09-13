export function materialResponseHeaders(input: { mimeType: string; size: number; originalName: string; preview: boolean }) {
  const headers = new Headers({
    "Content-Type": input.mimeType,
    "Content-Length": String(input.size),
    "Content-Disposition": `${input.preview ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(input.originalName)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": input.preview ? "SAMEORIGIN" : "DENY",
  });
  if (input.preview) {
    headers.set("Content-Security-Policy", `default-src 'none'; object-src 'self'; frame-ancestors 'self'; plugin-types ${input.mimeType}`);
  }
  return headers;
}
