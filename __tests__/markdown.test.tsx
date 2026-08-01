// XSS posture regression test (TDD target — RESEARCH Validation Architecture).
// react-markdown is safe by default: raw HTML is escaped to text (no
// rehype-raw), and defaultUrlTransform strips dangerous protocols. This test
// proves script/onerror/javascript: never reach the DOM (T-01-02-01).

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/components/posts/markdown-components";

describe("markdown XSS posture", () => {
  it("escapes raw <script> tags so they never become DOM script elements", () => {
    const { container } = render(
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {"before <script>alert(1)</script> after"}
      </Markdown>,
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("strips event-handler attributes from raw HTML (img onerror)", () => {
    const { container } = render(
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {'<img src=x onerror="alert(1)">'}
      </Markdown>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
  });

  it("neutralizes javascript: URLs in links", () => {
    const { container } = render(
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {"[x](javascript:alert(1))"}
      </Markdown>,
    );
    const anchors = container.querySelectorAll("a");
    for (const anchor of anchors) {
      expect(anchor.getAttribute("href")?.startsWith("javascript:")).toBe(false);
    }
  });

  it("renders a plain paragraph unchanged", () => {
    const { container } = render(
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {"Hello, **world**."}
      </Markdown>,
    );
    expect(container.textContent).toContain("Hello,");
  });
});
