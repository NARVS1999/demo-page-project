// MarkdownContent (server — NO "use client"): renders post content through the
// shared markdown pipeline — ONE components map + ONE .article-body class,
// identical to the client preview (RESEARCH Pattern 4 / Pitfall 5).

import Markdown from "react-markdown";
import {
  markdownComponents,
  remarkPlugins,
} from "@/components/posts/markdown-components";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="article-body">
      <Markdown remarkPlugins={remarkPlugins} components={markdownComponents}>
        {content}
      </Markdown>
    </div>
  );
}
