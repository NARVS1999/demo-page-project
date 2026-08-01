// Shared react-markdown components map — THE single source for article
// typography (RESEARCH Pattern 4). Imported by BOTH markdown-content (server
// article) and markdown-preview (client editor preview) so the two can never
// drift. A plain .tsx module with NO "use client"/"server-only" directives —
// safe in both runtimes.
//
// XSS posture (T-01-02-01): react-markdown escapes raw HTML by default; no
// raw-HTML rehype plugin and no innerHTML injection (grep-gated);
// defaultUrlTransform strips javascript: URLs. The regression test in
// __tests__/markdown.test.tsx proves all three.

import type { Components, ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

export const remarkPlugins = [remarkGfm];

// react-markdown injects a `node` prop into every renderer; it must not reach
// the DOM (unknown-attribute warning). Strip it while keeping the rest.
function dropNode({ node: _node, ...rest }: ExtraProps) {
  return rest;
}

export const markdownComponents: Components = {
  // h1 → h2 remap (a11y: the article page title is the only H1; RESEARCH
  // Open Question 3 resolution). h2 and h1 share the H2 style.
  h1: (props) => <h2 className="text-2xl font-semibold tracking-tight mt-8 mb-3" {...dropNode(props)} />,
  h2: (props) => <h2 className="text-2xl font-semibold tracking-tight mt-8 mb-3" {...dropNode(props)} />,
  h3: (props) => <h3 className="text-xl font-semibold tracking-tight mt-6 mb-2" {...dropNode(props)} />,
  // p: plain — spacing from the .article-body CSS class (single source)
  a: (props) => <a className="text-primary underline underline-offset-4 hover:text-primary/80" {...dropNode(props)} />,
  strong: (props) => <strong className="font-semibold" {...dropNode(props)} />,
  em: (props) => <em className="font-serif italic" {...dropNode(props)} />,
  blockquote: (props) => (
    <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground my-4" {...dropNode(props)} />
  ),
  ul: (props) => <ul className="pl-5 mb-4" {...dropNode(props)} />,
  ol: (props) => <ol className="pl-5 mb-4" {...dropNode(props)} />,
  hr: (props) => <hr className="my-8 border-t border-border" {...dropNode(props)} />,
  code: (props) => (
    <code className="font-mono text-sm bg-muted px-1.5 py-0.5 border border-border" {...dropNode(props)} />
  ),
  pre: (props) => (
    <pre className="font-mono text-sm bg-card border border-border p-4 overflow-x-auto mb-4" {...dropNode(props)} />
  ),
  // Plain <img>, never next/image (UI-SPEC) — user-authored markdown images
  img: (props) => <img className="w-full border border-border my-6" {...dropNode(props)} />,
  table: (props) => <table className="w-full text-sm border-collapse my-4" {...dropNode(props)} />,
  th: (props) => (
    <th className="border border-border px-3 py-2 font-semibold text-left" {...dropNode(props)} />
  ),
  td: (props) => <td className="border border-border px-3 py-2" {...dropNode(props)} />,
};
