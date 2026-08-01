// Single source for template identity — future apps change ONLY this file.
// TEMPLATE_VERSION: bump when forking for a new app (template-drift detection).

export const TEMPLATE_VERSION = "0.1.0";

export const SITE = {
  name: "nextjs-starter",
  tagline: "Fullstack demo template",
  description:
    "A battle-tested starter with auth, mock services, and a sample CRUD app — ready to deploy on Vercel at $0.",
  githubUrl: "https://github.com/NARVS1999/nextjs-starter",
  defaultNav: [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: "Posts", href: "/posts" },
    { label: "Admin", href: "/admin" },
  ],
} as const;
