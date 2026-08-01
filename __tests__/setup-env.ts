// Sets the 9 canonical env vars BEFORE any test module imports lib/env
// (which fails fast at module load) or lib/session (which reads SESSION_SECRET).
// Test placeholders only — valid https-style URLs satisfy z.url().
process.env.DATABASE_URL =
  "postgresql://user:pass@ep-test-pooler.us-east-2.aws.neon.tech/db?sslmode=require";
process.env.DATABASE_URL_DIRECT =
  "postgresql://user:pass@ep-test.us-east-2.aws.neon.tech/db?sslmode=require";
process.env.SESSION_SECRET =
  "test-session-secret-0123456789abcdef0123456789abcdef";
process.env.MOCK_PAYMENT = "mock";
process.env.MOCK_EMAIL = "mock";
process.env.MOCK_SMS = "mock";
process.env.MOCK_OAUTH = "mock";
process.env.MOCK_MAPS = "mock";
process.env.MOCK_STORAGE = "mock";
