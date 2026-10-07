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
The original fringe also contained a detached horizontal upper-eye stroke.
`optimize.mjs` removes that one source remnant in every state while keeping the
moving eye rims and the fringe's actual strand contours.
The jaw contour follows the head rather than the rotating side lock, keeping
the cheek/chin connection closed during Waiting's paw taps.
Its lower skin boundary is a smooth curve between the side locks. The outline
is generated only outside that skin boundary, preventing interior cheek lines
and steps at the underlay joins.
An arc mask with flat ends limits the border to the chin itself; the side edges
of the skin union cannot extend past either moving hair-lock anchor.
The same contour repair also applies to Idle, Waving, and Jumping, as requested.
The original right-lock underside is retained separately from the facial chin;
both used to share one stroke subpath.
Typing alternates paws across the upper, middle, and lower keyboard rows;
the active key and paw contact share the same coordinates. The stationary
shoulder crease is hidden, and the first pressing paw rotates -20 degrees
with its key contact fixed. Review shortens the lower fringe to 90%, keeping
pink hair paint out of the magnified iris.

`qa/hair-underside-audit.json` checks every RGBA cell and the backed-up renderer:
only the restored hair curve and requested review/typing changes may differ.
Movement and Failed remain pixel-identical. Earlier repair reports are archived
under `qa/history/` with their reviewed hashes.
`qa/face-typing-audit.json` checks iris visibility, paw contact, and frame timings.
`qa/review-typing-artifact-audit.json` checks for pink paint inside the lens iris.
Three independent blind reviews of all 16 directions are in `qa/blind-hair-*.json`.
Before/after loops are in `previews/comparison/`.
`qa/contour-audit.json` checks both jaw-to-hair connections in all 43 repaired poses.

Detailed rig notes: [BUILD.ko.md](BUILD.ko.md).
Original vector notes: [ORIGINAL.ko.md](ORIGINAL.ko.md).
