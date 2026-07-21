# Cactus art prompts

Assets in this directory were generated with the built-in image-generation tool, then selected through visual review.

## `desert-courtyard.png`

- Use case: `stylized-concept`
- Input: the supplied Cactus table screenshot as a style, lighting, camera, and mood reference only.
- Request: an original cinematic Southwestern desert courtyard at dusk, designed behind a live multiplayer card-table interface.
- Composition: 16:9, slightly elevated wide camera, visually quiet central 70%, edge-framing cacti, pottery, worn stone, and warm lanterns.
- Palette: burnt sienna, sandstone, charcoal brown, muted cactus green, amber gold, and twilight blue.
- Constraints: environment only; no people, characters, cards, table, interface, text, logo, or watermark.

## Character portraits

The eight portraits were generated as separate built-in image-generation calls. The supplied screenshot was used only for the warm cinematic mood; the approved Ranger portrait was then used only to keep rendering, framing, and rim-light treatment cohesive. Each character was generated waist-up on a flat chroma background, removed locally with the image-generation skill's soft-matte/despill helper, silhouette-checked, and normalized to a 512×512 alpha WebP with `client/scripts/optimize-avatar-assets.py`.

Shared constraints: original character; polished painterly 2.5D game illustration; front three-quarter pose; complete head and shoulders; readable at 96px; warm amber rim light; crisp isolated edges; no text, watermark, copied identity, cast shadow, photorealism, anime, chibi, or emoji styling.

- `ranger.webp`: confident adult cowboy, weathered brown hat, rust neckerchief, dark leather jacket.
- `maverick.webp`: broad-shouldered desert mechanic, short beard, denim work shirt, tan suspenders.
- `sage.webp`: clever adult Latina naturalist, auburn hair, charcoal field jacket, dusty-rose shirt, turquoise pendant.
- `prospector.webp`: spirited older treasure hunter, silver moustache, brass spectacles, ochre vest.
- `vaquera.webp`: assured adult Mexican cowgirl, cream curved-brim hat, low braid, deep-plum riding jacket. Generated against green after magenta-key QA rejected the first variant.
- `outlaw.webp`: approachable desert card sharp, textured dark hair, charcoal duster, burgundy neckerchief.
- `botanist.webp`: brilliant adult Black botanist, natural coily high puff, round glasses, sage field vest.
- `drifter.webp`: relaxed young adult traveler, sandy tousled hair, faded mustard woven poncho.
