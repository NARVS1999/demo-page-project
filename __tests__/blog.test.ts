// Pure helper unit tests (TDD target — RESEARCH Validation Architecture).
// lib/blog.ts is client-safe by contract (NO "server-only"): the editor-shell
// (browser) imports slugify/parseTags, public pages import readingTime/excerpt,
// and /blog/search imports escapeLike.
import { describe, expect, it } from "vitest";
import {
  escapeLike,
  excerpt,
  parseTags,
  readingTime,
  slugify,
} from "@/lib/blog";

describe("slugify", () => {
  it("lowercases and replaces non-alphanumeric runs with a single hyphen", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("collapses repeated hyphens from multi-space runs", () => {
    expect(slugify("Hello   World")).toBe("hello-world");
    expect(slugify("A  B  C")).toBe("a-b-c");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("!Hello World!")).toBe("hello-world");
    expect(slugify("!! Hello !!")).toBe("hello");
  });

  it("returns an empty string for empty input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("keeps numbers and single hyphens", () => {
    expect(slugify("Next.js 16 Guide")).toBe("next-js-16-guide");
  });
});

describe("escapeLike", () => {
  it("escapes the % wildcard", () => {
    expect(escapeLike("100%")).toBe("100\\%");
  });

  it("escapes the _ wildcard", () => {
    expect(escapeLike("a_b")).toBe("a\\_b");
  });

  it("escapes backslashes themselves", () => {
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeLike("hello world")).toBe("hello world");
  });
});

describe("readingTime", () => {
  it("returns 1 for empty or whitespace-only content", () => {
    expect(readingTime("")).toBe(1);
    expect(readingTime("   \n  ")).toBe(1);
  });

  it("returns 1 for exactly 200 words", () => {
    expect(readingTime("word ".repeat(200).trim())).toBe(1);
  });

  it("rounds up past 200 words", () => {
    expect(readingTime(`${"word ".repeat(200)}extra`)).toBe(2);
  });

  it("floors at 1 (never returns 0)", () => {
    expect(readingTime("one")).toBe(1);
  });
});

describe("excerpt", () => {
  it("strips markdown tokens to spaces", () => {
    const md = "# Heading *bold* `code` [link](url)";
    const out = excerpt(md);
    expect(out).not.toContain("#");
    expect(out).not.toContain("*");
    expect(out).not.toContain("`");
    expect(out).not.toContain("[");
    expect(out).not.toContain("]");
    expect(out).not.toContain("(");
    expect(out).not.toContain(")");
    expect(out).not.toContain("_");
    expect(out).not.toContain("~");
    expect(out).not.toContain(">");
  });

  it("clamps at 160 chars with an ellipsis", () => {
    const out = excerpt("a".repeat(300));
    expect(out).toHaveLength(161);
    expect(out.endsWith("…")).toBe(true);
  });

  it("leaves short text unchanged (no ellipsis)", () => {
    const out = excerpt("Short and sweet.");
    expect(out).toBe("Short and sweet.");
    expect(out.endsWith("…")).toBe(false);
  });

  it("collapses whitespace runs", () => {
    expect(excerpt("a   b\n\nc\td")).toBe("a b c d");
  });
});

describe("parseTags", () => {
  it("splits on comma, fullwidth comma, and newline", () => {
    expect(parseTags("a, b，c\nd")).toEqual(["a", "b", "c", "d"]);
  });

  it("trims whitespace and drops empties", () => {
    expect(parseTags("  a ,, , b ,")).toEqual(["a", "b"]);
  });

  it("dedupes case-insensitively keeping the first occurrence", () => {
    expect(parseTags("React, react, REACT")).toEqual(["React"]);
  });

  it("caps at 8 entries", () => {
    const out = parseTags("a,b,c,d,e,f,g,h,i,j");
    expect(out).toHaveLength(8);
    expect(out).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
  });
});
