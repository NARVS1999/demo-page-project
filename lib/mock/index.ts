// Single import surface for all mock services (locked pattern):
//   import { payment, email, sms, oauth, maps, storage } from "@/lib/mock";
// Swapping a service to a real provider replaces the file, never call sites.

export * as payment from "./payment";
export * as email from "./email";
export * as sms from "./sms";
export * as oauth from "./oauth";
export * as maps from "./maps";
export * as storage from "./storage";
