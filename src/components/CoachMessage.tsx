"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface CoachMessageProps {
  content: string;
}

const markdownComponents: Components = {
  // Downgrade headings: AI h1 → rendered h2, etc. (friendlier scale)
  h1: ({ children }) => (
    <h2 className="text-lg font-extrabold text-active-primary mt-4 mb-2 flex items-center gap-2">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="text-base font-bold text-active-primary mt-3 mb-1.5">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-bold text-active-text mt-2 mb-1">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-active-primary">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-active-text/80">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-active-secondary bg-active-secondary/10 rounded-r-lg pl-4 pr-3 py-2 my-3 text-active-text/80 italic">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-5 space-y-1.5 my-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 space-y-1.5 my-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-active-text/90 pl-1">{children}</li>
  ),
  hr: () => (
    <hr className="my-4 border-none h-0.5 bg-gradient-to-r from-active-primary/20 via-active-secondary/20 to-transparent rounded-full" />
  ),
  code: ({ children, className }) => {
    // If className contains "language-", it's a fenced code block
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block bg-active-bg border border-active-primary/15 rounded-xl p-3 my-2 font-mono text-sm text-active-text/80 overflow-x-auto whitespace-pre-wrap">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-active-primary/10 text-active-primary px-1.5 py-0.5 rounded-md font-mono text-[0.85em]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2">{children}</pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-active-secondary underline decoration-active-secondary/30 hover:decoration-active-secondary font-semibold"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-active-primary/20 bg-active-primary/5 px-3 py-1.5 text-left font-bold text-active-text text-sm">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-active-primary/10 px-3 py-1.5 text-active-text/80 text-sm">
      {children}
    </td>
  ),
};

/** Strip leading mascot emojis so they don't duplicate the CoachAvatar */
function stripLeadingMascot(text: string): string {
  return text.replace(/^(?:🦉|🦊|🐺)\s*/, "");
}

export default function CoachMessage({ content }: CoachMessageProps) {
  return (
    <div className="coach-message text-[0.95rem] leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {stripLeadingMascot(content)}
      </ReactMarkdown>
    </div>
  );
}
