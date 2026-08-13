# Design QA — Ecosia-aligned TERA landing page

## Evidence

- Source visual truth: `design-evidence/ecosia-desktop-hero.png`, `design-evidence/ecosia-desktop-section-1.png` through `design-evidence/ecosia-desktop-section-5.png`.
- Rendered implementation: `design-evidence/tera-final-desktop-hero.png`, `design-evidence/tera-final-desktop-section.png`, `design-evidence/tera-final-mobile.png`, and `design-evidence/tera-final-mobile-principles-settled.png`.
- Combined comparisons: `design-evidence/compare-final-hero.png` and `design-evidence/compare-final-section.png`.
- Desktop viewport: 1280 × 720 CSS px at device scale 1. Source and implementation screenshots are both 1280 × 720 pixels; no density normalization was required.
- Mobile implementation viewport: 390 × 844 CSS px at device scale 1. Implementation screenshot is 390 × 844 pixels.
- State: public landing page, unauthenticated, default theme, hero and first content section.

## Full-view comparison

The desktop implementation matches the source's major composition: an 8 px dark outer frame, an almost full-viewport rounded real-photo hero, centered bold wordmark and headline, large dark rounded primary interaction field, lime primary action, translucent proof strip, circular scroll control, sticky dark navigation, and modular dark story sections.

TERA intentionally uses its own copy, local licensed photographs, impact calculator, citations, and compiler actions. It does not reuse Ecosia branding, proprietary copy, counters, search function, or source assets.

## Focused comparisons

- Hero: `design-evidence/compare-final-hero.png` confirms matching radius, outer frame, centered visual hierarchy, dominant dark action surface, image density, and bottom scroll affordance.
- Principles section: `design-evidence/compare-final-section.png` confirms the four-column image-card rhythm, centered heading hierarchy, black background, compact typography, and lime action token.
- Mobile implementation: `design-evidence/tera-final-mobile.png` confirms the hero stacks cleanly at 390 × 844, the primary button remains fully visible, the proof strip becomes two rows, the sticky header is usable, and horizontal overflow is zero.

## Required fidelity surfaces

- Fonts and typography: bold grotesque/system sans hierarchy matches the source closely. TERA no longer uses the previous editorial serif styling. Wrapping and line-height remain readable on desktop and mobile.
- Spacing and layout rhythm: hero frame, centered content, wide dark control, compact proof strip, sticky header, four-card grid, section spacing, radii, and borders follow the source rhythm. The mobile layout deliberately stacks the source pattern to preserve readability.
- Colors and visual tokens: near-black canvas, charcoal surfaces, white text, muted gray copy, and high-visibility lime primary actions match the source system.
- Image quality and asset fidelity: all visible photography is local, real, sharp, and properly credited. The TERA hero uses a licensed leaf photograph with the same macro-nature density as the reference. Interface icons are locally hosted Lucide assets rather than text glyphs or handmade icons.
- Copy and content: all content is TERA-specific and evidence-led. No Ecosia copy, branding, or proprietary product behavior was copied.

## Interactions tested

- Impact calculator updates from 6,000 / 29.9 kg to 3,000 / 15.0 kg when output pages change from 24 to 30.
- Hero “Open TERA” navigates successfully to `/TERA.html`.
- Sticky “Compile booklets” CTA remains visible and usable.
- Scroll CTA targets the principles section.
- Console warning/error log on the local page: none.
- Automated project verification: 14 tests passed.

## Findings

- [P2] Mobile source comparison is blocked by a Chrome extension overlay.
  - Location: Ecosia reference at 390 × 844.
  - Evidence: TERA's mobile implementation was captured at the required viewport, but Chrome refuses automation while another extension UI is open. The in-app browser's advertised viewport override did not change its 1280 × 720 page viewport.
  - Impact: mobile implementation quality is verified independently, but exact mobile fidelity against the live Ecosia reference cannot yet be signed off.
  - Fix: dismiss the open Chrome extension UI, recapture Ecosia and TERA at 390 × 844, compare them together, and update this report.

## Comparison history

1. Earlier landing page used a light editorial layout, serif display type, and too many independent sections. User rejected it as unlike the reference.
2. Rebuilt the page around the captured Ecosia structure: dark canvas, immersive nature hero, centered wordmark/message, dark action field, lime CTA, proof strip, circular scroll control, sticky header, four-column principles, paired impact section, research list, and final CTA.
3. Replaced symbol glyphs with local Lucide assets and removed the extra left navigation item so the sticky header matches the reference's centered-logo/right-CTA balance.
4. Post-fix desktop comparison shows no remaining actionable P0/P1/P2 difference in the chosen TERA adaptation. Mobile source fidelity remains externally blocked as described above.

## Implementation checklist

- Dismiss the Chrome extension overlay.
- Capture the live Ecosia mobile hero and first story section at 390 × 844.
- Run one final same-viewport mobile comparison.

## Follow-up polish

- [P3] Consider a subtle entrance transition for the hero proof strip if motion remains restrained and respects reduced-motion preferences.

final result: blocked
