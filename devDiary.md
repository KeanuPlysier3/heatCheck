# Dev Diary

A log of every code change in Basketball Shootout: what was added or changed, why, and how it works.

<!-- Entry template:

## YYYY-MM-DD: short title

**What changed:** files and code added or changed.

**Why:** the reason for the change.

**How it works:** detailed explanation.

-->

## 2026-10-04: court moved into its own module

**What changed:**

- New `js/constants/court.js`: a `Court` object with the court's sizes in metres (`width` 15, `depth` 14,
  `thickness` 0.2, `surroundWidth` 40, `surroundDepth` 30).
- New `js/constants/colors.js`: a `Colors` object with `wood` (`0xCC8866`) and `surround` (`0x00008b`).
- New `js/objects/court.js`: exports `createCourt()`, which builds the surround and the playing surface and
  returns them inside one `Object3D`.
- `js/script.js`: the two inline blocks that built the floor and the court are replaced by
  `createCourt()`, `scene.add(court)` and one `makeAxisGrid(court, 'court', 15)`. Added the import for
  `createCourt`.

**Why:**

- `script.js` was going to grow with every object. The Aviator project from the course puts each object in
  its own file under `js/objects/` with a `createX()` function, and its colours in `js/constants/`, so the
  project follows the same structure.
- The court's sizes were loose numbers inside the geometry calls. The hoop, the court lines, the five
  shooting spots and the physics colliders will all need the same sizes, so they now come from one place.
- The old sizes (100 x 50) had no real unit. Everything is in metres now, because the physics engine
  (Rapier) assumes metres with its default gravity of 9.81.
- The old court was `BoxGeometry(15, 14, 2)` rotated a quarter turn: 2 m thick and centred on y = 0, so it
  stuck up 1 m through the floor. The old floor used `MeshBasicMaterial`, which ignores light and so could
  not show shadows.

**How it works:**

- `createCourt()` makes an empty `Object3D` called `court` and adds two meshes to it as children. Because
  they share one parent, the whole court can be moved, hidden or given a debug grid as a single thing, the
  same idea as `solarSystem` and `tank` in the scene graph exercises.
- **The surround** is a `PlaneGeometry` of 40 x 30. A plane stands upright by default, so it is rotated
  -90 degrees around x to lie flat. It sits at `y = -Court.thickness` (-0.2), below the playing surface. If
  both surfaces were at the same height the renderer could not tell which one is in front and they would
  flicker (z-fighting).
- **The playing surface** is a `BoxGeometry(width, thickness, depth)`, so 15 x 0.2 x 14. A box takes its
  three sizes as x, y, z, which means it is already flat and needs no rotation. A box is centred on its own
  middle, so it is moved down by half its thickness (`y = -0.1`). That puts its top exactly at `y = 0`.
  Everything else in the game can then treat `y = 0` as the ground: the rim will simply be at `y = 3.05`.
- Both meshes use `MeshPhongMaterial`, which reacts to light, and have `receiveShadow = true`, so shadows
  from the ball, player and hoop can fall on them.
- In `script.js` the debug grid is added outside `createCourt()`, so the object file has no debug code in
  it and the debug panel can be removed later by editing one file.
- The court is centred on the origin for now. Where the origin should be (under the hoop is a likely
  choice) gets decided when the hoop is added.

## 2026-10-04: rim position fixed

**What changed:** in `js/objects/hoop.js`, the rim block.

- New `rimHeight = 3.05`, used as the rim's y position. It was `backboardBottom + backboardHeight` (3.95).
- New `backboardFront = -(poleRadius + backboardThickness)`, and the rim's z position is now
  `backboardFront - (rimRadius + rimThickness)`. It was `-(poleRadius + rimThickness / 2)`.
- The comment on the rotation line was corrected. The rotation itself is unchanged.

**Why:**

- The old y put the rim at the top edge of the backboard, 3.95 m up. A rim hangs at 3.05 m, near the
  bottom of the board.
- The old z only moved the rim 0.125 in front of the pole's centre. A torus is positioned by its centre, so
  the ring was centred on the pole and backboard and stuck out behind them as much as in front.

**How it works:**

- A `TorusGeometry(rimRadius, rimThickness)` is a ring. `rimRadius` runs from the centre of the ring to the
  centre of its tube, and `rimThickness` is the radius of the tube. So the outer edge of the ring is
  `rimRadius + rimThickness` away from its centre.
- The parts of the hoop are lined up along z, measured from the hoop's own origin at the foot of the pole.
  Negative z is the side facing the court. The pole's surface is at `-poleRadius`, and the backboard lies
  against it, so the backboard's front face is at `-(poleRadius + backboardThickness)` = -0.15.
- To make the ring's back edge touch that face, the ring's centre has to be one outer radius further out:
  `backboardFront - (rimRadius + rimThickness)` = -0.15 - 0.5 = -0.65.
- A torus stands upright by default (it lies in the x/y plane, like a plane geometry), so
  `rotation.x = Math.PI / 2` lays it flat. That was already there.
- Because the position is calculated from the sizes, changing `rimRadius`, `rimThickness` or the backboard's
  thickness keeps the rim touching the board.

## 2026-10-04: debug orbit camera

**What changed:** all in `js/script.js`.

- Imported `OrbitControls` from `three/addons/controls/OrbitControls.js`.
- New shared variable `controls`.
- In `init`, after the camera is created: a block marked `DEBUG ONLY` that creates the controls, turns on
  damping, sets the orbit target to the origin and adds an "orbit camera (debug)" checkbox to the lil-gui
  panel.
- In `render`: `controls.update()` before `renderer.render(...)`.
- Removed `camera.up.set(0, 0, 1)`.

**Why:**

- With a fixed camera it was hard to see where objects really were: a pole half sunk into the floor and a
  rim in the wrong place both looked fine from one angle. Being able to fly around the scene shows that
  kind of mistake straight away.
- This is a tool for building the scene and nothing more. The game itself gets a fixed camera behind the
  shooter, so every line of it is marked `DEBUG ONLY` and the block says how to remove it.
- `OrbitControls` is what the course uses for this, in the Shadertoy project (`theory/shadertoy`).
- `camera.up.set(0, 0, 1)` was left over from the straight-down view. `OrbitControls` rotates the camera
  around its up direction, so with +z as "up" the camera would roll sideways while orbiting.

**How it works:**

- `new OrbitControls(camera, renderer.domElement)` gets two things: the camera it should move, and the
  element it listens on for mouse and touch input, which is the canvas. Left-drag orbits, right-drag pans,
  scroll zooms.
- `controls.target` is the point the camera circles around and keeps looking at. It is set to the origin,
  the same point as the existing `camera.lookAt(0, 0, 0)`, so the view at page load is the same as before.
  From then on the controls call `lookAt` on the target themselves.
- `enableDamping` makes the movement slow down gradually after the mouse is released. That glide is
  animated frame by frame, which is why `controls.update()` has to run in the render loop.
- `gui.add(controls, 'enabled')` binds a checkbox to the controls' own `enabled` property, the same way
  the axis grid checkboxes are bound to `helper.visible`. Unticking it makes the controls ignore the mouse,
  and the camera stays where it is.
- Removing `camera.up.set(0, 0, 1)` does not change the starting view: the camera sits at `(0, 9, -7)`
  looking at the origin, and from there +y and +z both point to the top of the screen.
- To remove the debug camera later: delete the block in `init`, the import, the `controls` variable and the
  `controls.update()` line.

## 2026-10-04: black outlines around the objects

**What changed:**

- New `js/constants/outline.js`: an `Outline` object with `enabled` (true) and `thickness` (0.03 m).
- New `js/helpers/outline.js`: exports `createOutlineMesh(outlineGeometry)`, which returns a black shell
  mesh for a given geometry.
- `js/constants/colors.js`: added `outline: 0x000000`.
- `js/objects/hoop.js`: three outlines, each added as a child of the mesh it belongs to:
  `poleOutlineGeometry` / `poleOutlineMesh`, `backBoardOutlineGeometry` / `backBoardOutlineMesh`,
  `rimOutlineGeometry` / `rimOutlineMesh`. Two new imports.
- `js/objects/court.js`: `floorOutlineGeometry` / `floorOutlineMesh`, a child of `floorMesh`. Two new
  imports.
- The surround has no outline: it is a flat plane that runs under everything, so it has no silhouette to
  draw a line around.

**Why:**

- To give the objects a cartoon outline, so their shapes read clearly against each other and the
  background.
- three.js has no outline setting on a mesh. The course has no method for it either, so this is the
  "inverted hull" technique, which only needs things the theory already covered: a second mesh, a material
  and the scene graph.
- The thickness is one constant so every outline can be tuned at the same time.
- The thickness is a size in metres, not a scale factor. Scaling a copy by, say, 1.05 enlarges it from its
  centre, so the outline would be 5% of each dimension: on the 15 m wide floor that is 37 cm at the sides
  and 0.5 cm on top, on the pole it is thick at the ends and thin along the sides, and on the rim the ring
  would get wider without the hole getting an outline. Building each shell from the object's own sizes plus
  the same number of metres gives an outline that is equally thick everywhere.

**How it works:**

- For each object a second geometry is made with the same shape, `Outline.thickness` bigger on every side:
  - box (backboard, floor): each of the three sizes gets `+ Outline.thickness * 2`, once for each of the
    two opposite sides.
  - cylinder (pole): the radius gets `+ Outline.thickness`, the height `+ Outline.thickness * 2`.
  - torus (rim): the tube radius gets `+ Outline.thickness`. The ring radius stays the same, so the tube
    grows around its own centre line and the inside of the hole gets an outline too.
- `createOutlineMesh` wraps that geometry in a mesh with a black `MeshBasicMaterial`. Basic means it
  ignores light, so the outline is the same black from every angle.
- The material has `side: THREE.BackSide`: only the inside walls of the shell are drawn. The half of the
  shell between the camera and the object is seen from its outside, so it is not drawn and the object stays
  visible. The half behind the object is seen from its inside, so it is drawn. The object covers most of
  it, and the part that sticks out past the object's edge is the outline. Without `BackSide` the bigger
  black shell would simply hide the object.
- Each outline mesh is added to its own object's mesh (`poleMesh.add(poleOutlineMesh)`), so it takes over
  that mesh's position and rotation and needs none of its own. The rim outline lies flat because the rim
  does.
- `outlineMesh.visible = Outline.enabled` is set in the helper. `visible = false` makes the renderer skip
  the mesh, so setting `Outline.enabled` to `false` removes every outline.
- The outline meshes do not cast shadows, so the shadows keep the size of the real objects.

**How to undo it:**

- Quick: set `enabled: false` in `js/constants/outline.js`. The scene looks as it did before.
- Complete: the outlines were added on top of commit `dc42902` with a clean working tree, so
  `git restore js` followed by deleting `js/constants/outline.js` and the `js/helpers` folder brings the
  code back to that commit. (`devDiary.md` would still have this entry.)

## 2026-10-04: new colour palette

**What changed:**

- `js/constants/colors.js`: every colour value replaced, and four keys added.

  | Key | Before | After |
  | --- | --- | --- |
  | `background` (new) | `0x8080`, written directly in `script.js` | `0xFFA552` sunset orange |
  | `surround` | `0x00008b` | `0x4A3470` purple asphalt |
  | `court` (was `wood`) | `0xCC8866` | `0x16C7B0` teal |
  | `courtPaint` (new, not used yet) | | `0xFF3D8B` hot pink |
  | `courtLines` (new, not used yet) | | `0xFFF1D0` cream |
  | `hoopPole` | `0x808080` | `0xFFD400` yellow |
  | `hoopBackboard` | `0xFFFFFF` | `0xFFF1D0` cream |
  | `hoop` | `0xFF0000` | `0xFF5A1F` hot orange |
  | `net` | `0xFFFFFF` | `0xFFF1D0` cream |
  | `outline` | `0x000000` | `0x1B1030` very dark purple |
  | `accent` (new, not used yet) | | `0xB6F500` lime green |

- `js/objects/court.js`: the floor material uses `Colors.court` (the key was renamed from `wood`).
- `js/script.js`: `scene.background` now uses `Colors.background`, and `Colors` is imported.

**Why:**

- The world should feel like a late-90s cartoon skate park: loud colours, a street court, dark outlines.
- `wood` was renamed to `court` because the floor is now a painted street court and no longer hardwood, so
  the old name would describe the wrong thing.
- The background colour was the only colour not in `colors.js`. With it there, the whole palette is in one
  file.

**How it works:**

- Nothing changes in how colours are applied: every material still reads its colour from the `Colors`
  object, so swapping the values in one file recolours the whole scene.
- The palette is built on opposite colours. Orange (sky) and teal (court) sit across from each other on the
  colour wheel, which makes the court stand out from the background. Pink and purple do the same on a
  smaller scale.
- There is no pure white and no pure black. Cream (`0xFFF1D0`) and very dark purple (`0x1B1030`) take their
  place, so the lightest and darkest colours still belong to the same warm/purple family as the others.
- `courtPaint`, `courtLines` and `accent` are in the file for the court markings and the UI, which do not
  exist yet.
- The old values are kept in a comment at the bottom of `colors.js`, so going back means copying them into
  the object.
- The hoop materials still have `emissive` set to their own colour, so the hoop shows its new colours at
  full strength without shading. The lighting was not changed here.

## 2026-10-04: hoop reads its sizes from the constants

**What changed:** `js/objects/hoop.js`.

- The nine local size variables are gone: `poleHeight`, `poleRadius`, `backboardWidth`, `backboardHeight`,
  `backboardThickness`, `backboardBottom`, `rimHeight`, `rimRadius`, `rimThickness`.
- In their place, one statement at the top of `createHoop()` takes the same nine names out of
  `Court.Hoop`, the object in `js/constants/court.js`.
- Nothing else in the file changed, and the values are the same, so the hoop looks exactly as before.

**Why:**

- The hoop's sizes were typed inside `createHoop()`, where no other file could read them. The three-point
  line needs the rim's position as the centre of its arc, and later the physics colliders and the shot
  calculation need the rim and backboard sizes too.
- With the sizes in the constants file, there is one place that says how big the hoop is. Before this
  change the constants file and `hoop.js` each had their own copy, and changing one would not have changed
  the other.

**How it works:**

- `const { poleHeight, poleRadius, ... } = Court.Hoop;` is destructuring: it creates a local variable for
  each name listed and fills it with the property of the same name from the object. It is short for
  writing `const poleHeight = Court.Hoop.poleHeight;` nine times.
- Because the local names are the same as before, every line below it (geometries, positions, outlines)
  keeps working without being touched.
- `Court` was already imported in `hoop.js` for `Court.depth`, so no new import was needed.
- `backboardFront` is still a local variable. It is not a size but a position calculated from two of the
  sizes, so it stays next to the code that uses it.

## 2026-10-04: key sizes added to the court constants

**What changed:** `js/constants/court.js` has a new `key` group inside `Court`:

| Key | Value | Meaning |
| --- | --- | --- |
| `width` | 4.9 | along x, centred on the hoop |
| `length` | 5.8 | along z, from the baseline to the free-throw line |
| `freeThrowCircleRadius` | 1.8 | the circle centred on the middle of the free-throw line |
| `noChargeRadius` | 1.25 | the small semicircle under the hoop, measured from the point under the rim |

**Why:** the key is the next court marking to be drawn (`js/objects/key.js`). Its sizes go in the constants
first, so the drawing and anything that later needs to know where the key is read the same numbers, the
same way the three-point line does.

**How it works:**

- These are the official FIBA measurements, in metres like every other size in the file. FIBA is used
  because the court (28 x 15, here cut to a 14 m half) and the three-point line (6.75 m) are FIBA sizes
  too. An NBA key would be 4.88 wide and 5.79 long.
- The values are only data. Nothing reads them yet, so the scene looks the same.
- `length` is measured from the baseline, not from the rim, because the key is a rectangle that starts at
  the baseline. With the baseline at `Court.depth / 2`, the free-throw line is at
  `Court.depth / 2 - Court.key.length`.
- The free-throw circle's centre is the middle of the free-throw line, so its position follows from
  `length`. The no-charge semicircle is centred under the rim, at `Court.Hoop.rimZ`, like the three-point
  arc.

## 2026-10-04: hoop moved to its official position, built around the rim

**What changed:**

- `js/constants/court.js`
  - Three new values in `Court.Hoop`: `rimFromBaseline` (1.575), `poleBehindBaseline` (0.6) and
    `armThickness` (0.12).
  - `Court.Hoop.rimZ` is now `Court.depth / 2 - Court.Hoop.rimFromBaseline`, which is 5.425. It used to be
    calculated from the pole (pole position minus pole radius, backboard thickness and rim size) and was
    6.6.
  - `Court.Hoop.z` is removed. Nothing used it apart from the old `rimZ` formula.
- `js/objects/hoop.js`, rewritten around a new origin:
  - The hoop group's origin is now the point on the floor under the centre of the rim. It used to be the
    foot of the pole.
  - The rim sits on that origin. The backboard is directly behind it. The pole stands 0.6 m behind the
    baseline, with its foot on the surround.
  - New part: the arm (`armGeometry`, `armMesh`), a beam from the back of the backboard to the pole, with
    its own outline (`armOutlineGeometry`, `armOutlineMesh`).
  - The whole hoop is placed with `hoop.position.set(0, 0, Court.Hoop.rimZ)`. It used to be
    `Court.depth / 2`.
- `threePointLine.js` and `key.js` were not touched.

**Why:**

- The key's side lines looked too long. They were correct (5.8 m from the baseline), but the rim hung only
  0.4 m from the baseline where the official distance is 1.575 m. The three-point arc is measured from the
  rim, so the whole arc sat 1.175 m too close to the baseline while the key, measured from the baseline,
  stayed put.
- `rimZ` was calculated from the pole, so any change to the pole or a new part between pole and rim would
  have moved the rim as a side effect, and with it the three-point line. The rim is the point the game
  measures everything from (the arc, the scoring, the shot's target, later the physics), so it is now the
  value that is stated directly, and the pole is placed from it.

**How it works:**

- `rimFromBaseline` is the one number that decides where the rim is. `rimZ` is the baseline's position
  (`Court.depth / 2` = 7) minus that distance.
- Inside `createHoop()` every part is positioned relative to the rim's point, along z. Positive z is
  towards the baseline:

  | Part | z from the rim's point | How it is calculated |
  | --- | --- | --- |
  | rim | 0 | it is the origin |
  | backboard, front face | 0.25 | `rimRadius + rimThickness`, the ring's outer edge |
  | backboard, back face | 0.30 | front face + `backboardThickness` |
  | pole | 2.175 | `rimFromBaseline + poleBehindBaseline` |
  | arm | from 0.30 to 2.175 | length = pole - back of the backboard = 1.875 |

- The arm is a box, positioned by its centre, so its z is the midpoint of its two ends:
  `(backboardBack + poleZ) / 2`. Its height is the middle of the backboard.
- The pole stands off the court slab, on the surround, which lies `Court.thickness` (0.2) lower than the
  playing surface. So the pole is `poleHeight + Court.thickness` long, and its centre is halfway between
  its foot (-0.2) and its top (3.5): `(poleHeight - Court.thickness) / 2`.
- The results, all following from the constants without any change to the line files:

  | | Before | After | Official |
  | --- | --- | --- | --- |
  | rim to baseline | 0.4 | 1.575 | 1.575 |
  | rim to free-throw line | 5.4 | 4.225 | 4.225 |
  | free-throw line to the top of the arc | 1.35 | 2.525 | 2.525 |
  | three-point corner piece | 1.81 | 2.99 | 2.99 |

- One difference from an official hoop is left in on purpose: the rim touches the backboard, so the
  backboard's face is 1.325 m from the baseline. On a real hoop a small bracket leaves a gap and the face
  is at 1.2 m. The rim's position, which is what the game uses, is exact.

## 2026-10-04: court lines changed from cream to yellow

**What changed:** in `js/constants/colors.js`, `courtLines` went from `0xFFF1D0` (cream) to `0xFFD400`
(yellow, the same value as `hoopPole`). The old value is kept in the comment on that line.

**Why:**

- Cream lines on the teal court looked pale. Cream is a light, low-saturation colour, and the lines are
  lit like everything else, so in the shade of the scene's single light they turn greyish and lose
  definition against the textured floor.
- Yellow is the colour of painted lines on playgrounds and streets, which fits the street-court setting
  better than the cream of an indoor gym floor.
- Yellow keeps its strength next to teal: the two are far apart on the colour wheel, and yellow is
  saturated where cream is not.
- Using the pole's yellow, and not a new shade, keeps the palette small. The court markings and the hoop's
  frame now read as one painted set, and cream is left for the backboard and the net.

**How it works:** the three-point line (`threePointLine.js`) and the key (`key.js`) both build their
material from `Colors.courtLines`, so the one value recolours every line. No other file changed.

## 2026-10-05: texture path updated for the build

**What changed:** `js/objects/court.js`, the floor texture path, from `'assets/textures/courtTexture2.jpg'`
to `'textures/courtTexture2.jpg'`. The texture files were moved from `assets/textures/` to
`public/textures/`.

**Why:** in the build (`npm run build`, tested with `npm run preview`) the floor texture failed to load.
The files were in `assets/textures/` at the project root, and Vite did not copy them into `dist/`, the
folder that becomes the website. The dev server had hidden the problem because it serves the whole project
folder.

**How it works:**

- Vite puts two kinds of files into the build: files the code `import`s, which it follows and bundles, and
  every file in `public/`, which it copies as it is. A path inside a string, like the one passed to
  `TextureLoader().load(...)`, is neither: Vite sees only text, not a file reference.
- Files in `public/` are served from the root of the site, without `public` in the path. So
  `public/textures/courtTexture2.jpg` is at `textures/courtTexture2.jpg`, both on the dev server and in the
  build.
- The path has no leading slash, so it is relative to the page. That keeps it working when the site is
  served from a subfolder, as it will be on GitHub Pages (`/heatCheck/`).

## 2026-10-05: build setup for GitHub Pages

**What changed:**

- `package.json`: two scripts next to `dev`: `"build": "vite build"` and `"preview": "vite preview"`.
- New `vite.config.js` in the project root, with `base: './'`.

**Why:** the site will be published on GitHub Pages, which needs a built version of the project, and serves
it from a subfolder named after the repo (`https://keanuplysier3.github.io/heatCheck/`), not from the root
of the domain.

**How it works:**

- `npm run build` runs `vite build`, which bundles the code and three.js into one JavaScript file, copies
  everything in `public/`, and writes the finished site to `dist/`. `npm run preview` serves that `dist/`
  folder locally, so the real build can be tested before it goes online.
- Vite reads `vite.config.js` automatically when it starts, because of the file's name and place, next to
  `package.json`. It does not need to be imported anywhere.
- By default Vite writes the script tag in the built `index.html` with an absolute path,
  `/assets/index-....js`. The leading `/` means "from the root of the domain", so on GitHub Pages the
  browser would ask for `keanuplysier3.github.io/assets/...` and get nothing, because the site is in
  `/heatCheck/`. That gives a blank page.
- `base: './'` makes Vite write relative paths: `./assets/index-....js`, meaning "next to this
  `index.html`". That works wherever the site is served from: in `preview`, on Pages, or under a renamed
  repo.
- In the build the script tag is moved from the bottom of `<body>` into `<head>`, and the inline CSS is
  compressed. That is normal Vite output.
- The build warns that the JavaScript file is over 500 kB. That is almost all three.js (its WebGPU build is
  large). The download is about 236 kB compressed, which is fine for a game.
