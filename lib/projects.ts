import "server-only";

export interface Project {
  slug: string;
  name: string;
  description: string;
  liveUrl: string;
  githubUrl: string;
  techStack: string[];
  demoEmail: string;
  demoPassword: string;
  mockServices: string[];
}

export const projects: Project[] = [
  {
    slug: "nextjs-starter",
    name: "nextjs-starter",
    description:
      "Battle-tested starter template with auth, mock services, and reference CRUD app",
    liveUrl: "https://nextjs-starter-narvs.vercel.app",
    githubUrl: "https://github.com/NARVS1999/nextjs-starter",
    techStack: [
      "Next.js 16",
      "TypeScript",
      "Tailwind v4",
      "Neon Postgres",
      "shadcn/ui",
    ],
    demoEmail: "demo@example.com",
    demoPassword: "demo1234",
    mockServices: ["payment", "email", "SMS", "OAuth", "maps", "storage"],
  },
  {
    slug: "cms-app",
    name: "CMS Demo",
    description:
      "Blog/content management with post CRUD, markdown editor, categories, and admin dashboard",
    liveUrl: "https://cms-app-narvs.vercel.app",
    githubUrl: "https://github.com/NARVS1999/cms-app",
    techStack: [
      "Next.js 16",
      "TypeScript",
      "Tailwind v4",
      "Neon Postgres",
      "shadcn/ui",
    ],
    demoEmail: "demo@example.com",
    demoPassword: "demo1234",
    mockServices: ["storage"],
  },
  {
    slug: "booking-app",
    name: "Booking App",
    description:
      "Service scheduling with slot calendar, booking flow, and mock email/SMS confirmations",
    liveUrl: "https://booking-app-narvs.vercel.app",
    githubUrl: "https://github.com/NARVS1999/booking-app",
    techStack: [
      "Next.js 16",
      "TypeScript",
      "Tailwind v4",
      "Neon Postgres",
      "shadcn/ui",
    ],
    demoEmail: "demo@example.com",
    demoPassword: "demo1234",
    mockServices: ["payment", "email", "SMS"],
  },
  {
    slug: "ecommerce-app",
    name: "Northstar Coffee",
    description:
      "Coffee shop storefront with catalog, cart, mock checkout, and admin order management",
    liveUrl: "https://ecommerce-app-narvs.vercel.app",
    githubUrl: "https://github.com/NARVS1999/ecommerce-app",
    techStack: [
      "Next.js 16",
      "TypeScript",
      "Tailwind v4",
      "Neon Postgres",
      "shadcn/ui",
    ],
    demoEmail: "demo@example.com",
    demoPassword: "demo1234",
    mockServices: ["payment", "email"],
  },
];
