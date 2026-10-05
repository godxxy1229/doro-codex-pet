# Build and validate

The original vector, rig, pose definitions, and build tools are included.
Node.js 22 or newer and npm are required.

```sh
npm ci
npm run optimize
npm run build
npm run package:pet
```

`final/` holds the canonical atlas: 73 animation cells and 15 transparent cells.
`package/` holds the public `doro-svg` install package. It additionally copies
the first Idle frame into the community website's neutral slot (row 0, column 6).
The animation cells, their order, and their timings are identical.

To inspect selected states, run `node build.mjs idle review`.
To emit frame vectors, run `node build.mjs --dump-svg`.

## Validation and previews

Python with Pillow and NumPy, ffmpeg, and the installed work-pets 0.1.6 and
hatch-pet validation/preview scripts are needed for the full QA workflow:

```sh
bash tools/validate.sh --gate
```

On Windows, use Git Bash with the same Windows home directory as Codex.
The validation tools are external dependencies and are not redistributed here.
See [AGENTS.md](../AGENTS.md) for the blind direction-review procedure.

Stored QA reports identify the atlas hashes they reviewed. The published
community atlas also has a separate package report and blind direction review.
The reports' documented gaps between legs are intentional transparent space.

The local pet `~/.codex/pets/doro/` receives the canonical artwork while retaining
its existing manifest and selection. Public installation uses
`~/.codex/pets/doro-svg/` and the English public manifest.

## Face and typing revision (2026-10-06)

Waiting and Look keep both eyes readable by reducing eye displacement and
shortening only the lower fringe. The crown stays fixed. Blush remains attached
to the face. Behind the moving eyes, subtle blush and matching black strokes
complete the gaps in the original fringe contour; no decorative strands are added.
The lashes draw behind the fringe in these states so they do not leave black
eyebrow-like marks on top of the pink hair.
The jaw contour follows the head rather than the rotating side lock, keeping
the cheek/chin connection closed during Waiting's paw taps.
Its lower skin boundary is a smooth curve between the side locks. The outline
is generated only outside that skin boundary, preventing interior cheek lines
and steps at the underlay joins.
The same contour repair also applies to Idle, Waving, and Jumping, as requested.
Typing alternates paws across the upper, middle, and lower keyboard rows;
the active key and paw contact share the same coordinates.

Only rows 0, 3, 4, 6, 7, 9, and 10 changed. `qa/face-typing-audit.json` checks unchanged
pixels, iris visibility, paw contact, and frame timings. Three independent blind
reviews of all 16 directions passed; their reports are `qa/blind-face-*.json`.
Before/after loops are in `previews/comparison/`.
`qa/contour-audit.json` checks both jaw-to-hair connections in all 43 repaired poses.

Detailed rig notes: [BUILD.ko.md](BUILD.ko.md).
Original vector notes: [ORIGINAL.ko.md](ORIGINAL.ko.md).
