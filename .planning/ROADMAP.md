# Roadmap: ads-mediatech v1.0

**Milestone:** v1.0 — Philippine Peso & Real Images
**Created:** 2026-08-03
**Phases:** 1
**Requirements:** 10 mapped

## Phase 1: Currency & Images

**Goal:** Localize all currency displays to ₱ and replace placeholder images with real product/blog imagery.

**Requirements:** CURL-01, CURL-02, CURL-03, CURL-04, CURL-05, CURL-06, IMG-01, IMG-02, IMG-03, IMG-04

**Success Criteria:**
1. `formatShopPrice()` and `formatUsd()` return `₱` prefix in all outputs
2. Product filter labels display `₱` currency symbols
3. Landing page proof point shows `₱0`
4. Seed email bodies use `₱` currency
5. All test expectations match `₱` format
6. 12 shop product images downloaded to `public/images/shop/`
7. 5 blog cover images downloaded to `public/images/blog/`
8. Seed data references local image paths, not picsum.photos
9. Shop and blog pages render real images correctly

**Build Order:**
1. Currency swap (CURL-01 through CURL-06) — code changes + test updates
2. Image download (IMG-01, IMG-02) — fetch and save images
3. Seed update (IMG-03) — update seed.ts image URLs
4. Verification (IMG-04) — visual check and test pass

---
*Roadmap created: 2026-08-03*
