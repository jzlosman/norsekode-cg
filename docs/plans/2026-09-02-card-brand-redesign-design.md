# Norse Kode Card Brand Redesign

## Purpose

Bring every card front into the visual world established by the Norse Kode music brand and the new NK/Yggdrasil card back. The redesign should feel like modern music with Viking influence: cinematic darkness, geometric rune construction, bone and charcoal contrast, thin linework, and controlled aurora color. It must remain a readable traditional playing-card system rather than becoming a collection of miniature posters.

## Brand foundation

Canonical brand colors:

- Charcoal: `#1E2227`
- Obsidian: `#0D0F12`
- Deep fjord navy: `#18303C`
- Bone/cream: `#EAE2D0`
- Aurora mint: `#46E3A8`

Suit accents extend the aurora family:

| Suit | Luminous value | Dark ink value | Meaning |
|---|---:|---:|---|
| Axe | Ember `#FF7A3D` | `#9B341D` | force, impact, fire |
| Sword | Aurora mint `#46E3A8` | `#126A4F` | cold precision, master brand |
| Spear | Ultraviolet `#A970FF` | `#5C35A5` | reach, mystery, northern light |

Luminous values appear against dark surfaces. Ink values are reserved for bone surfaces where contrast requires them.

## Shared card grammar

All cards remain 750×1050 PNGs and share one immutable structural system:

- 30 px outer safe edge and rounded clipping boundary.
- Thin double frame with one neutral structural rail and one class/suit rail.
- Identical corner rank boxes, baselines, icon positions, and 180° rotation.
- One geometric sans voice for names, labels, and rules, using uppercase tracking consistent with the music website.
- Bravyn Runeskald only for corner ranks and Hero letters.
- A small exact NK bind-rune mark in a consistent position.
- Thin geometric SVG weapon symbols derived from the angular construction of the NK mark.
- Color reinforces silhouettes; it never replaces suit shape.

The Bravyn font is bundled with its supplied commercial-use notice so generator output remains reproducible. Rank glyphs receive per-glyph optical sizing/offsets, especially 4, 6, 9, and 10.

## Night cards: standard and special suits

Standard and special suit cards use an obsidian field with subtle fjord-navy atmospheric depth. A reusable low-contrast aurora texture may sit behind pips, but it cannot contain scenery, text, symbols, or bright detail competing with gameplay information.

- Bone outer frame.
- Luminous suit inner rail and rank.
- Simplified SVG weapon pips in bone with controlled suit illumination.
- Existing algorithmic pip layouts and inverse corner ranks remain intact.
- Standard cards retain a quiet suit label rather than explanatory text.

### Bloodsworn

Bloodsworn remains rank 5 and keeps five recognizable suit pips. Its central pip is incorporated into an angular oath-knot that visually reaches toward the next-card edge. The mirrored special rail reads:

- `BLOODSWORN`
- `JOIN WITH NEXT WARRIOR`

### Shield Wall

Shield Wall remains rank 6. Its six pips lock into a rigid 2×3 shield/palisade construction. A segmented inner frame interrupts the ordinary flowing rail. The mirrored special rail reads:

- `SHIELD WALL`
- `BREAK ANY CHAIN BONUSES`

Both specials must be identifiable from structure before their rule line is read.

## Saga cards: Heroes

Heroes deliberately invert the surface to bone. This is taxonomy, not a separate visual system: dark cards are the arsenal; bone cards are named figures entering the saga.

- Bone field.
- Charcoal outer frame and neutral fjord inner rail.
- No suit color or suit symbol.
- Charcoal Bravyn face letters: Shield Maiden `S`, Berserker `B`, Ravenfeeder `R`, Jarl `J`.
- The same rank placement, frame geometry, radii, NK location, and line weights as Night cards.
- Portraits occupy roughly 65% of the center field and dissolve into bone rather than sitting in hard rectangular boxes.

Portrait direction is “cinematic illuminated etching”: expressive painted faces and dramatic atmospheric lighting combined with engraved contours and cross-hatching in armor, hair, and fabric. Fjord shadows and mist fade into bone. Aurora mint is a shared mystical rim light, not a Hero suit color. Avoid photorealism, glossy fantasy rendering, white-line inversion, or full-bleed poster compositions.

Hero public terminology:

- Shield Maiden — `VENGEANCE`
- Berserker — existing automatic-win/next-loss rule
- Ravenfeeder — unsuited Strength 12 treatment
- Jarl — `LEAD BY EXAMPLE`

Jarl replaces Skald publicly while preserving the existing +3 win / +2 tie / +1 loss mechanics and the consumed-Bloodsworn trigger. New cards use `jarl-*` IDs. TTS Lua retains `skald-*` aliases so existing saved cards remain resolvable.

## Generator and asset boundaries

- The generator owns frames, typography, ranks, mirrored rotations, pip placement, suit treatment, special rails, Hero labels, and output manifests.
- SVG owns geometric marks: NK mark, suit pips, oath knot, shield-wall construction, rails, and frame details.
- Image generation owns only the neutral Night texture and four Hero portraits.
- ImageMagick owns deterministic composition, background cleanup, color processing, atlas assembly, and PNG output.
- Generated card fronts and the TTS atlas remain checked in for direct use.

## Quality gates

- Readable at TTS hand-card size and when viewed in the ten-card draft.
- Rank and suit recognizable without reading labels.
- Bloodsworn and Shield Wall distinguishable before reading rules.
- Hero class recognizable from bone surface and face letter.
- No hidden formation information added to fronts or backs.
- Deck remains exactly 42 cards in the existing order and 7×6 atlas geometry.
- Browser resolver, TTS detailed resolver, and optimized AI retain behavioral parity.
- Existing TTS saves with `skald-*` GMNotes remain compatible through aliases.
