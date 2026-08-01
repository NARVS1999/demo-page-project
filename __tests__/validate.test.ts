import { describe, expect, it } from "vitest";
// envSchema moved to lib/env.ts (server-only) with the CR-01 split; input
// schemas stay in lib/validate.ts (client-safe).
import { envSchema } from "@/lib/env";
import {
  categorySchema,
  loginSchema,
  postSchema,
  registerSchema,
  tagSchema,
} from "@/lib/validate";

describe("envSchema", () => {
  it("reports a clear field error when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _drop, ...withoutDb } = {
      DATABASE_URL: "postgresql://u:p@ep-x-pooler.aws.neon.tech/db?sslmode=require",
      DATABASE_URL_DIRECT: "postgresql://u:p@ep-x.aws.neon.tech/db?sslmode=require",
      SESSION_SECRET: "a".repeat(40),
      MOCK_PAYMENT: "mock",
      MOCK_EMAIL: "mock",
      MOCK_SMS: "mock",
      MOCK_OAUTH: "mock",
      MOCK_MAPS: "mock",
      MOCK_STORAGE: "mock",
    };
    const result = envSchema.safeParse(withoutDb);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.DATABASE_URL).toBeDefined();
      expect(fieldErrors.DATABASE_URL![0]).toBeTruthy();
    }
  });

  it("rejects a SESSION_SECRET shorter than 32 characters with a clear message", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://u:p@ep-x-pooler.aws.neon.tech/db?sslmode=require",
      DATABASE_URL_DIRECT: "postgresql://u:p@ep-x.aws.neon.tech/db?sslmode=require",
      SESSION_SECRET: "too-short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.SESSION_SECRET).toBeDefined();
      expect(fieldErrors.SESSION_SECRET![0]).toContain("32 characters");
    }
  });

  it("passes a valid full env and applies MOCK_* defaults", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://u:p@ep-x-pooler.aws.neon.tech/db?sslmode=require",
      DATABASE_URL_DIRECT: "postgresql://u:p@ep-x.aws.neon.tech/db?sslmode=require",
      SESSION_SECRET: "a".repeat(40),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.MOCK_PAYMENT).toBe("mock");
      expect(result.data.MOCK_EMAIL).toBe("mock");
      expect(result.data.MOCK_SMS).toBe("mock");
      expect(result.data.MOCK_OAUTH).toBe("mock");
      expect(result.data.MOCK_MAPS).toBe("mock");
      expect(result.data.MOCK_STORAGE).toBe("mock");
    }
  });
});

describe("registerSchema", () => {
  it("rejects a 7-character password", () => {
    const result = registerSchema.safeParse({
      name: "Demo User",
      email: "demo@example.com",
      password: "1234567",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.password![0]).toContain("at least 8");
    }
  });

  it("rejects a 73-character password (bcrypt 72-byte cap)", () => {
    const result = registerSchema.safeParse({
      name: "Demo User",
      email: "demo@example.com",
      password: "x".repeat(73),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a 1-character name", () => {
    const result = registerSchema.safeParse({
      name: "T",
      email: "demo@example.com",
      password: "password1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name![0]).toContain("at least 2");
    }
  });

  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({
      name: "Demo User",
      email: "demo@example.com",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "demo@example.com",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email via z.email()", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.email).toBeDefined();
    }
  });
});

describe("postSchema", () => {
  it("rejects a 2-character title", () => {
    const result = postSchema.safeParse({
      title: "ab",
      content: "Some content",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title![0]).toContain("at least 3");
    }
  });

  it("rejects empty content", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.content![0]).toBeTruthy();
    }
  });

  it("accepts a valid post with status defaulting to 'draft'", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
    }
  });

  it("rejects an unknown status value", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      status: "live",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slug with spaces", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      slug: "Hello World",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.slug).toBeDefined();
    }
  });

  it("rejects an uppercase slug", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      slug: "UPPER",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a kebab-case slug", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      slug: "hello-world",
    });
    expect(result.success).toBe(true);
  });

  it("treats an empty slug as absent (parsed to undefined)", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      slug: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBeUndefined();
    }
  });

  it("accepts missing or null categoryId", () => {
    const noCategory = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
    });
    expect(noCategory.success).toBe(true);

    const nullCategory = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      categoryId: null,
    });
    expect(nullCategory.success).toBe(true);
  });

  it("treats the form's empty-string categoryId as null", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      categoryId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBeNull();
    }
  });

  it("rejects a non-UUID categoryId", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      categoryId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("transforms a comma-joined tags string into an array capped at 8", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      tags: "a, b, c, d, e, f, g, h, i, j",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toHaveLength(8);
      expect(result.data.tags[0]).toBe("a");
    }
  });

  it("accepts a valid https coverImage URL", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      coverImage: "https://picsum.photos/seed/test/800/533",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a garbage coverImage URL", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      coverImage: "not a url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.coverImage).toBeDefined();
    }
  });

  it("rejects a javascript: coverImage URL (MD-03)", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      coverImage: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.coverImage).toBeDefined();
    }
  });

  it("rejects a data: coverImage URL (MD-03)", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      coverImage: "data:text/html,<script>alert(1)</script>",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an http:// coverImage URL (MD-03)", () => {
    const result = postSchema.safeParse({
      title: "A valid title",
      content: "Some content",
      coverImage: "http://example.com/cover.jpg",
    });
    expect(result.success).toBe(true);
  });
});

describe("categorySchema", () => {
  it("rejects a 1-character name", () => {
    const result = categorySchema.safeParse({ name: "T", slug: "t" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name![0]).toContain("at least 2");
    }
  });

  it("rejects an uppercase slug", () => {
    const result = categorySchema.safeParse({ name: "Testing", slug: "UPPER" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid {name, slug}", () => {
    const result = categorySchema.safeParse({ name: "Testing", slug: "testing" });
    expect(result.success).toBe(true);
  });
});

describe("tagSchema", () => {
  it("rejects a 1-character name", () => {
    const result = tagSchema.safeParse({ name: "T", slug: "t" });
    expect(result.success).toBe(false);
  });

  it("rejects an uppercase slug", () => {
    const result = tagSchema.safeParse({ name: "Testing", slug: "UPPER" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid {name, slug}", () => {
    const result = tagSchema.safeParse({ name: "Testing", slug: "testing" });
    expect(result.success).toBe(true);
  });
});
