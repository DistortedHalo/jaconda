Figma patch applied

What changed
- Reworked the top-right branding into a typographic corner mark used on Home, Learn More, and Footer.
- Replaced placeholder card SVGs with the supplied image assets in editorial layouts.
- Added mixed but controlled image ratios and object-position tuning for cleaner crops.
- Kept the existing functional flow intact, including Learn More and Submit Brief.
- Updated frontend Vite scripts to use the local Vite binary more reliably.

Frontend files touched
- frontend/src/HomePage.tsx
- frontend/src/LearnMorePage.tsx
- frontend/src/components/CornerBrand.tsx
- frontend/src/components/Footer.tsx
- frontend/package.json

Validation
- frontend build passes with `npm run build`
