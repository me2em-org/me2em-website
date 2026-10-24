/**
 * Favicon generation — the SVG half.
 *
 * The brand mark is pure geometry on a 16-unit grid:
 *   - a rounded-square badge (accent fill, rx = 3),
 *   - the Identity square at the centre (4×4),
 *   - four Handle dots in the corners (r = 1.5).
 *
 * No edges are drawn: Me2eM derivation is stateless — nothing is stored
 * between an Identity and its Handles, the relationship is recomputed from
 * the seed every time. The empty space is the protocol, not a missing graph.
 *
 * Invariants (BACKLOG BL-7):
 * - rx = 3 exactly. The corner dots (centres at 3|13) sit concentric with
 *   the badge's corner arcs, so the dot-to-edge gap stays even around the
 *   arc. Moving rx without moving the dots breaks that.
 * - All coordinates are integers or half-units; at 16 px the centre square
 *   rasterises pixel-exact.
 *
 * There is no font path here — and must not be one. The previous monogram
 * outlined a letter against an embedded font subset because crawlers do not
 * load web fonts (Google SERP fell back to a globe). Geometry needs no font,
 * so that failure mode is gone by construction. This file builds strings
 * only and is safe in any runtime; the native half (sharp, ICO) stays
 * quarantined in raster.ts — see the split note there (#600).
 */

const VIEW = 16;
const FG = '#ffffff';

/** Identity: the root, centre of the mark. */
const IDENTITY = { x: 6, y: 6, s: 4 };
/** Handles: four contexts, one per corner. */
const HANDLES: Array<[number, number]> = [
  [3, 3],
  [13, 3],
  [3, 13],
  [13, 13],
];
const DOT_R = 1.5;
/** Corner rounding. Must stay 3 — see invariants above. */
const BADGE_RX = 3;

/**
 * Maskable safe-zone scale. Android crops maskable icons to a centred circle
 * of radius 40% of the canvas (6.4 units here). Unscaled, the mark reaches
 * 8.57 units (corner dot far edge) and would be clipped; scaled by 0.7 around
 * the centre the farthest painted point is 6.0 — inside the zone.
 */
const MASKABLE_SCALE = 0.7;

/**
 * Build the brand mark as a self-contained SVG string.
 *
 * `size` is written into width/height (the viewBox stays 16) so librsvg
 * rasterises natively at the target resolution and sharp never upscales.
 *
 * @param size     rendered width/height in px
 * @param accent   badge fill; callers pass THEME_COLOR
 * @param maskable full-bleed variant (rx = 0, mark scaled into the safe zone)
 */
export function buildMarkSvg(
  size: number,
  accent: string,
  { maskable = false }: { maskable?: boolean } = {}
): string {
  const badge = maskable
    ? `<rect width="${VIEW}" height="${VIEW}" fill="${accent}"/>`
    : `<rect width="${VIEW}" height="${VIEW}" rx="${BADGE_RX}" fill="${accent}"/>`;

  const shapes = [
    `<rect x="${IDENTITY.x}" y="${IDENTITY.y}" width="${IDENTITY.s}" height="${IDENTITY.s}" fill="${FG}"/>`,
    ...HANDLES.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${DOT_R}" fill="${FG}"/>`),
  ].join('');

  const inset = ((1 - MASKABLE_SCALE) * VIEW) / 2;
  const mark = maskable
    ? `<g transform="translate(${inset} ${inset}) scale(${MASKABLE_SCALE})">${shapes}</g>`
    : shapes;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${VIEW} ${VIEW}">${badge}${mark}</svg>`
  );
}