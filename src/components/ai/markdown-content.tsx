"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

function safeHref(href: string | undefined) {
  if (!href) return undefined;
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}

const components: Components = {
  h1: ({ children }) => <h3 className="mt-5 text-base font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-5 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 text-sm font-semibold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-3 text-sm font-semibold first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>,
  hr: () => <hr className="my-4 border-border" />,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-5">{children}</pre>,
  code: ({ className, children }) => <code className={`${className ?? ""} rounded bg-muted px-1 py-0.5 text-[0.9em]`}>{children}</code>,
  table: ({ children }) => <div className="my-3 overflow-x-auto"><table className="min-w-full border-collapse text-left text-xs">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => <th className="border px-2 py-1.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border px-2 py-1.5 align-top">{children}</td>,
  a: ({ href, children }) => {
    const destination = safeHref(href);
    return destination ? <a className="font-medium text-primary underline underline-offset-2" href={destination} target="_blank" rel="noreferrer">{children}</a> : <span>{children}</span>;
  },
};

export function MarkdownContent({ content }: { content: string }) {
  return <div className="markdown-content break-words text-sm leading-6">
    <ReactMarkdown
      components={components}
      remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
      rehypePlugins={[rehypeKatex]}
      skipHtml
    >
      {content}
    </ReactMarkdown>
  </div>;
}
