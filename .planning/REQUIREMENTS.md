# Requirements: ads-mediatech

**Defined:** 2026-08-03
**Core Value:** Every fork works out of the box with real database rows, not static mockups.

## v1 Requirements

Requirements for Philippine Peso & Real Images milestone.

### Currency Localization

- [ ] **CURL-01**: `formatShopPrice()` in `lib/shop.ts` returns `₱` prefix instead of `$`
- [ ] **CURL-02**: `formatUsd()` in `lib/booking.ts` returns `₱` prefix instead of `$`
- [ ] **CURL-03**: Product filter labels in `components/shop/product-filters.tsx` use `₱` (Under ₱5, ₱5–₱15, Over ₱15)
- [ ] **CURL-04**: Landing page proof point in `app/(main)/page.tsx` uses `₱0` instead of `$0`
- [ ] **CURL-05**: Seed email bodies in `scripts/seed.ts` use `₱` instead of `$`
- [ ] **CURL-06**: All test expectations in `__tests__/shop.test.ts`, `__tests__/booking.test.ts`, and `__tests__/shop-ui.test.tsx` updated to expect `₱`

### Images

- [ ] **IMG-01**: Download 12 shop product images (espresso, latte, cold brew, cortado, coffee beans × 4, croissant, bun, cookie, scone) to `public/images/shop/`
- [ ] **IMG-02**: Download 5 blog cover images (code editor, API network, cloud servers, newspaper typography, markdown writing) to `public/images/blog/`
- [ ] **IMG-03**: Update `scripts/seed.ts` to reference local image paths (`/images/shop/{slug}.jpg`, `/images/blog/{slug}.jpg`) instead of `picsum.photos` URLs
- [ ] **IMG-04**: Verify images display correctly in shop product cards and blog post cards

## v2 Requirements

Deferred to future release.

### Extended Localization

- **L10N-01**: Date formats localized to Filipino format
- **L10N-02**: Number formatting with Philippine peso comma separators

### Image Management

- **IMGM-01**: Admin UI to upload/change product images
- **IMGM-02**: Image optimization (WebP conversion, responsive sizes)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real payment processing | Demo template only, mock providers sufficient |
| OAuth login | Email/password sufficient for template use case |
| Mobile app | Web-first with responsive design |
| Full i18n | Single locale (₱) for now, not multi-language |
| Image CDN/caching | Local images sufficient for demo scale |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CURL-01 | Phase 1 | Pending |
| CURL-02 | Phase 1 | Pending |
| CURL-03 | Phase 1 | Pending |
| CURL-04 | Phase 1 | Pending |
| CURL-05 | Phase 1 | Pending |
| CURL-06 | Phase 1 | Pending |
| IMG-01 | Phase 1 | Pending |
| IMG-02 | Phase 1 | Pending |
| IMG-03 | Phase 1 | Pending |
| IMG-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-03*
*Last updated: 2026-08-03 after initial definition*
