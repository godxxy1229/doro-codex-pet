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

The pre-existing local pet `~/.codex/pets/doro/` is preserved; public installation
uses `~/.codex/pets/doro-svg/`.

Detailed rig notes: [BUILD.ko.md](BUILD.ko.md).
Original vector notes: [ORIGINAL.ko.md](ORIGINAL.ko.md).
