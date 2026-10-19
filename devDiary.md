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

## 2026-10-05: motion spike, steps 1 and 2 (webcam and WebGPU backend)

**What changed:**

- Installed `@tensorflow-models/pose-detection` (2.1.3), `@tensorflow/tfjs-core`,
  `@tensorflow/tfjs-converter` and `@tensorflow/tfjs-backend-webgpu` (all 4.22.0). npm also installed
  their required extras: the WebGL, WASM and CPU backends and `@mediapipe/pose`.
- New `spike/motion.html`: a page with a `<video>` element that loads `spike/js/script.js`.
- New `spike/js/script.js`:
  - asks for the webcam with `getUserMedia` and shows it in the video element;
  - imports TensorFlow.js and its WebGPU backend, switches to it with `tf.setBackend('webgpu')` and logs
    whether that worked and which backend is in use.

**Why:** the motion spike is a throwaway test page that checks whether webcam shooting can work at all,
before any of it goes into the game. Steps 1 and 2 answer the first question: does TensorFlow.js run on
WebGPU in this browser? The spike sits inside the project so it shares `node_modules`, and it is not part
of the build because nothing in the game imports it.

**How it works:**

- `navigator.mediaDevices.getUserMedia(constraints)` asks the browser for the camera and returns a
  `MediaStream`. The constraints ask for the front camera (`facingMode: "user"`) at 1280 x 720 if possible
  (`ideal` is a request, not a requirement). It only works in a secure context, which `localhost` is.
- A live stream is not a file with an address, so it is connected with `video.srcObject = stream`, not
  `src`. `video.play()` starts it; without that the element shows nothing, and no error is raised.
- `import '@tensorflow/tfjs-backend-webgpu'` has no name and no `from`: it is imported only so it registers
  itself as a backend called `'webgpu'`. Installing a backend is not enough; it has to be imported.
- `tf.setBackend('webgpu')` returns a promise that resolves to `true` or `false`. It does not throw when a
  backend fails, so the log prints the result and `tf.getBackend()`, the backend actually in use.
- The page must be opened through Vite (`npm run dev`, `localhost:5173/spike/motion.html`). A plain file
  server like Live Server cannot turn package names like `'@tensorflow/tfjs-core'` into files.

**Result:** `webgpu started: true | backend in use: webgpu` (Windows, AMD Radeon RX 9070 XT). The first
risk, whether TensorFlow.js runs on WebGPU at all, is cleared for this machine. TensorFlow.js also warns
that the `powerPreference` option is ignored on Windows: it asks for the high-performance GPU, and Chrome
on Windows uses the default GPU instead. With one graphics card that is the same card; on a laptop with two
GPUs it could mean the weaker, built-in one is used.

## 2026-10-05: motion spike, step 3 (MoveNet running) and the MediaPipe stand-in

**What changed:**

- `vite.config.js`: a `resolve.alias` that sends every import of `'@mediapipe/pose'` to
  `js/shims/mediapipe-pose.js`.
- New `js/shims/mediapipe-pose.js`: exports an empty `class Pose {}`.
- `spike/js/script.js`:
  - `init` is now `async` and runs its steps in a fixed order, each one awaited: switch to the WebGPU
    backend, start the webcam (`await getMedia`, which now does `await video.play()`), create the MoveNet
    detector, then start the detection loop.
  - The separate `tf.setBackend(...).then(...)` at the top of the file is gone; step 1 of `init` does it.
  - New `detect` function: runs `detector.estimatePoses(video)`, logs the result, and schedules itself for
    the next frame with `requestAnimationFrame`.

**Why:**

- Importing `pose-detection` stopped Vite with `MISSING_EXPORT: "Pose" is not exported by
  @mediapipe/pose`. `pose-detection` always imports `Pose` from that package, for its BlazePose model's
  MediaPipe engine. `@mediapipe/pose` is an old-style script that puts its contents on the global `window`
  and has no exports, so the import cannot be resolved. MoveNet never uses it.
- The first detection failed with `importExternalTexture ... doesn't have back resource`: MoveNet tried to
  read a frame from the video before the video had one, because `getMedia` and `video.play()` were not
  awaited and the code ran ahead of the camera.

**How it works:**

- `resolve.alias` tells Vite: when code imports this name, load that file instead. The stand-in only has to
  export something called `Pose` so the import resolves. It is never called. It lives in the game's
  `js/shims/` and not in `spike/`, because the game will import `pose-detection` too, and the spike folder
  will be deleted later. (If BlazePose with the MediaPipe engine were ever needed, this stand-in would break
  it.)
- `fileURLToPath(new URL('./js/shims/mediapipe-pose.js', import.meta.url))` turns the path, relative to
  `vite.config.js`, into the full path on disk, which is how the Vite documentation writes aliases.
- After changing the config, Vite's library cache has to be rebuilt once with `npx vite --force`.
- `await` pauses `init` until each step is really finished. `video.srcObject = stream` only connects the
  stream; the first frame and the video's size arrive a moment later. `await video.play()` resolves once
  playback has started, so a frame exists when MoveNet first reads the video.
- `createDetector(SupportedModels.MoveNet, { modelType: SINGLEPOSE_LIGHTNING })` downloads and prepares the
  model the first time. Single pose tracks one person; Lightning is the fast MoveNet variant, chosen because
  release timing needs many detections per second.
- `detect` uses `requestAnimationFrame` because this page has no three.js renderer. Because the next call is
  scheduled only after `await estimatePoses(...)` has finished, a slow detection never overlaps the next one.
- Each result is an array with one pose, whose `keypoints` are 17 objects with `x`, `y` (video pixels, y
  grows downward), `score` (confidence 0 to 1) and `name`.

## 2026-10-05: motion spike, step 4 (green dots on the keypoints)

**What changed:**

- `spike/motion.html`: the video is wrapped in a `<div id="stage">` together with a new
  `<canvas id="overlay">`, plus a small `<style>` block that lays the canvas exactly on top of the video.
- `spike/js/script.js`:
  - new variables `canvas` and `ctx`, and a constant `minScore = 0.3`;
  - in `init`, after the webcam is playing, the canvas is given the video's size and its 2D drawing
    context is stored in `ctx`;
  - `detect` calls a new function `drawKeypoints(poses)` in place of `console.log(poses)`;
  - new function `drawKeypoints`, which clears the canvas and draws a green circle on each keypoint.

**Why:** to see whether MoveNet is actually tracking the body, and how well, in this room's light and at
this distance. Numbers in the console can't show that; dots that follow the arms can. Removing the
`console.log` also stops the console being flooded every frame, which slows the page down.

**How it works:**

- The stage `div` is `position: relative` and the canvas inside it is `position: absolute` at `top: 0;
  left: 0`, so the canvas is drawn over the video, starting at the same corner. `display: inline-block`
  makes the div only as big as the video.
- MoveNet returns keypoint positions in the video's own pixels. Setting `canvas.width` and
  `canvas.height` to `video.videoWidth` and `videoHeight` gives the canvas the same pixel grid, so a
  keypoint's `x` and `y` can be drawn without any conversion. This is done after `await getMedia(...)`,
  because the video's size is 0 until its first frame has arrived.
- `canvas.getContext("2d")` returns the object that draws on the canvas (`ctx`).
- Every frame, `drawKeypoints` first clears the whole canvas, otherwise the dots of every previous frame
  would stay and smear into lines. If no person is found (`poses` is empty) it stops there.
- For each of the 17 keypoints of the first pose, it skips points with a `score` below `minScore`: the model
  is guessing those, for example a wrist that is out of view. The rest get a filled circle:
  `ctx.arc(x, y, 6, 0, Math.PI * 2)` is a circle of radius 6 px going all the way round (0 to 2π radians),
  and `ctx.fill()` paints it in the current `fillStyle`, lime green.

## 2026-10-05: motion spike, step 5 (measuring the arms)

**What changed:**

- `spike/motion.html`: a `<pre id="readout">` under the video, with a style for large monospace text.
- `spike/js/script.js`:
  - a `shot` object with the two thresholds: `loadedMaxAngle` (110) and `releaseMinAngle` (160);
  - `point(pose, name)`: finds a keypoint by its name;
  - `angleAt(a, b, c)`: the angle at point `b`, in degrees;
  - `measureArm(pose, side)`: elbow angle, wrist above head, hand low, and from those `loaded` and
    `released`, for the left or the right arm;
  - `drawArm(arm)`: a line shoulder → elbow → wrist, white, orange when loaded, red at a release;
  - `showReadout(left, right)`: the live numbers for both arms under the video;
  - `detect` calls these every frame.

**Why:** recognising a shot is done with rules on the keypoints, not a trained model. A model would still
need the same load-then-release logic and a confidence threshold, plus hundreds of recorded example
frames, and when it misfires there is no number to look at. With rules, a missed shot shows exactly which
value fell short. This step only measures and shows; it does not decide on shots yet. The thresholds have
to be tuned by watching real values while moving, and that needs them on screen first.

**How it works:**

- **Elbow angle** (`angleAt(shoulder, elbow, wrist)`):
  1. Two arrows starting at the elbow: shoulder minus elbow, and wrist minus elbow.
  2. Their dot product, `ab.x * cb.x + ab.y * cb.y`: positive when the arrows point roughly the same way,
     negative when they point apart.
  3. Divided by both arrows' lengths (`Math.hypot`), which leaves the cosine of the angle between them, a
     value from -1 (straight arm, arrows opposite) through 0 (90°) to 1 (folded completely).
  4. `Math.acos` turns the cosine into the angle in radians, `* 180 / Math.PI` into degrees.
  5. The cosine is clamped to -1..1 first: on a dead-straight arm, rounding can give -1.0000001, and
     `acos` of that is `NaN`.
  Checked with known arms: a 90° corner gives 90, a straight line 180, the worked example 108.
- **Wrist above head:** `wrist.y < nose.y`. y = 0 is the top of the video and grows downward, so a higher
  point has a smaller y.
- **Hand low:** `wrist.y > shoulder.y`, the wrist is below the shoulder.
- **Loaded:** hand low and elbow angle under `loadedMaxAngle`. **Released:** wrist above head and elbow
  angle over `releaseMinAngle`. These are ranges, not exact poses: any angle from 160° to 180° counts as
  open, so a sloppy shot still passes.
- If the model's score for the shoulder, elbow, wrist or nose is under `minScore`, `measureArm` returns
  `null` and that arm is shown as "not visible enough". No decision is made on a guessed point.
- Angles do not depend on the distance to the camera or on body size, so the same thresholds work for any
  player.

## 2026-10-05: motion spike, step 6 (one-motion shot), in motion2 / script2

**What changed:**

- New `spike/motion2.html`, a copy of `motion.html` that loads `script2.js`, with a big "SHOT!" banner
  (`#shotBanner`) laid over the video.
- New `spike/js/script2.js`, a copy of `script.js` with:
  - two more values in `shot`: `loadTimeout` (1500 ms) and `cooldown` (1000 ms);
  - a `shotState` object that remembers, between frames, when each arm was last loaded, until when the
    cooldown runs, and how many shots were recognised;
  - `updateShot(side, arm, now)`, called for both arms every frame, which turns the per-frame labels into
    one shot;
  - `shotReleased(time, side)`, the event a recognised shot ends in: here it counts the shot, logs it and
    shows the banner for 0.6 s;
  - the readout shows each arm's state (ready, loaded and for how long, cooldown) and the shot count.
- `motion.html` and `script.js` are unchanged, so the measuring version stays available.

**Why:** the measurements from step 5 label each frame correctly, but a shot is a movement, not a frame. A
single frame cannot tell a shot from someone raising their arms to stretch, and the follow-through after a
release would keep counting as new releases. The game needs one shot, counted once, at the moment of
release, because that moment is compared with the shot meter.

**How it works:**

- `updateShot` works per arm, and a shot is: **that arm loaded, then that same arm released, within
  `loadTimeout`**.
  - While the arm is loaded, `loadedAt[side]` is set to the current time on every frame, so it always holds
    the last moment the arm was still loaded. The timeout therefore measures the time from leaving the load
    position to the release, not how long the ball was held.
  - A release with no load remembered (`loadedAt` is `null`) is ignored. That is what filters out stretching
    and waving.
  - If more than `loadTimeout` has passed since the last loaded frame, the load is forgotten.
  - On a release that follows a load, both arms' `loadedAt` are cleared, the cooldown starts, and
    `shotReleased` fires with the time of that frame. Clearing both arms means a two-handed shot counts
    once.
  - During the cooldown every frame is ignored, so the arms still being up after the shot do not count
    again.
- A frame where the model is unsure about the arm's points (`arm` is `null`) changes nothing: a blurred
  wrist mid-shot does not cancel the load.
- `performance.now()` gives the time in milliseconds since the page loaded; all times in `shotState` use
  it.
- `shotReleased(time, side)` is the spike's version of the game's `shotReleased(time)` event. In the game,
  the same call will start the shot, with `time` compared to the shot meter.
- Checked with a simulation of scripted frames: a normal shot fires once at the release; arms raised without
  loading fire nothing; a release 2 s after the load fires nothing; a second release inside the cooldown is
  ignored while a new shot after it fires; two hands loading and releasing together fire once.

## 2026-10-05: motion spike, conclusion: go

No code changed in this entry. It records the outcome of the motion spike (`spike/motion.html`,
`spike/motion2.html`), which was planned for 5-7 October with the decision due on 12 October.

**What the spike had to answer, and the results:**

| Question | Result |
| --- | --- |
| Does TensorFlow.js run on the WebGPU backend? | Yes. `tf.setBackend('webgpu')` returns `true` and `tf.getBackend()` reports `webgpu` (Windows, AMD Radeon RX 9070 XT). |
| Is MoveNet fast enough? | Yes. MoveNet SinglePose Lightning keeps up with real shooting speed. Not measured as a number: by eye it is clearly fast enough for the game, and a figure would not change the decision. |
| Does it track the body well? | Yes. The keypoints follow the shoulders, elbows and wrists closely, including with the arms above the head. |
| Can a shot be recognised reliably? | Yes. The per-frame labels (loaded, released) were accurate, and the one-motion shot detection (load, then release of the same arm within 1.5 s, then a 1 s cooldown) recognised shots very accurately in testing. |

**Decision: go.** Webcam motion stays the main way to play. Keyboard/click stays the fallback and must keep
working without a webcam.

**Settings that worked:** `minScore` 0.2, `loadedMaxAngle` 110°, `releaseMinAngle` 160°, `loadTimeout`
1500 ms, `cooldown` 1000 ms.

**Still open:**

- MoveNet has not yet run next to the three.js scene. On the spike page it has the GPU to itself; in the
  game it shares it with the court, the shadows and later the fire shader. This will show when the
  detection moves into the game: if the scene or the shot detection stutters, that sharing is the first
  thing to check.
- Tested by one person, in one room's light. Other players, distances and lighting are untested.
- Two workarounds carry over into the game: the `@mediapipe/pose` stand-in (`js/shims/mediapipe-pose.js`,
  aliased in `vite.config.js`), and the strict order of starting the backend, then the webcam, then the
  detector.

**Next for this code:** the detection (`measureArm`, `angleAt`, `updateShot` and the `shot` settings)
moves into the game as `js/input/motion.js`, where a recognised shot calls the game's `shotReleased(time)`.
The `spike/` folder can be deleted after that; it is not part of the build.

## 2026-10-06: player constants

**What changed:** new `js/constants/player.js`, exporting a `Player` object with the character's sizes:
feet, legs, torso, head, arms, and the number of segments for the round parts. Below the object, five
values are calculated from those sizes: `hipY`, `shoulderY`, `shoulderX`, `headY` and `height`.

**Why:** the player is the next object to build, and it follows the same rule as the court and the hoop:
sizes are stated once in the constants, and the object file reads them. The player's sizes will be needed
in more than one place: `createPlayer()` builds the body from them, the ball has to start at hand height,
and the shot's launch point is at the hands above the head.

**How it works:**

- Everything is in metres, and the character's origin is on the floor between the feet, so placing the
  player at `y = 0` stands it on the court. That matches the hoop, whose origin is the point on the floor
  under the rim.
- The body is stacked from the floor up, and the derived values are the heights where one part ends and the
  next begins:

  | Value | Calculation | Result |
  | --- | --- | --- |
  | `hipY` | `footHeight + legLength` | 0.88 |
  | `shoulderY` | `hipY + torsoHeight - shoulderDrop` | 1.40 |
  | `headY` (centre of the head) | `hipY + torsoHeight + neckGap + headRadius` | 1.64 |
  | `height` (top of the head) | `headY + headRadius` | 1.80 |
  | `shoulderX` | `torsoWidth / 2 + armRadius` | 0.27 |

- They are calculated after the object, not inside it, for the same reason as `Court.Hoop.rimZ`: an object
  cannot read its own values while it is still being written.
- Capsule lengths (`legLength`, `upperArmLength`, `forearmLength`) are the full length including the
  rounded ends. three.js's `CapsuleGeometry(radius, length)` wants only the straight middle part, so the
  geometry will be made with `length - radius * 2`.
- `shoulderY` and `shoulderX` are where the shoulder pivots will go, and `upperArmLength` is the distance
  from there to the elbow pivot.
- `radialSegments: 8` and `capSegments: 2` keep the round parts low-poly, for the faceted cartoon look.
- Nothing uses the file yet, so the scene is unchanged.

## 2026-10-06: player now reads its sizes from the constants correctly

**What changed:** `js/objects/player.js` (the first version of `createPlayer()`, written by hand).

- Every size was read from `player`, the lowercase `Object3D` container. They are now read from `Player`,
  the constants object with a capital.
- Names that did not exist in the constants were replaced with the ones that do:

  | Was | Now |
  | --- | --- |
  | `headHeight` | `Player.headY` |
  | `legWidth`, `legDepth` | `Player.legRadius * 2`, kept in a local `legWidth` |
  | `legHeight` | `Player.legLength` |
  | `shoulderHeight` | `Player.shoulderY` |
  | `upperArmWidth` / `Depth`, `lowerArmWidth` / `Depth` | `Player.armRadius * 2`, kept in a local `armWidth` |
  | `upperArmHeight` | `Player.upperArmLength` |
  | `lowerArmHeight` | `Player.forearmLength` |
  | the x positions built from `shoulderWidth` | `Player.shoulderX` and `-Player.shoulderX` |

- The positions and the structure were left as they were. Only the lookups changed.

**Why:** the player did not appear, and no error was shown.

**How it works:**

- `player` and `Player` are two different things. `player` is the empty `Object3D` that holds the body
  parts; it has `position`, `rotation` and `add()`. `Player` is the object exported from
  `constants/player.js`; it has the sizes.
- Reading a property that an object does not have gives `undefined`, not an error. So
  `player.headRadius` was `undefined`, and a geometry built from `undefined` sizes ends up with `NaN`
  ("not a number") for its vertices. A shape without valid coordinates draws nothing.
- The constants give legs and arms a radius, because they were sized as capsules. A box needs a full width,
  which is twice the radius.
- Known and left for later: the positions are not right yet. The torso and legs are placed around y = 0, so
  the legs hang below the floor, the arms point up from the shoulder height, and there is one shoulder
  object that ends up at the second position, with all four arm boxes in it.

## 2026-10-06: player positions fixed, two arms with shoulder and elbow pivots

**What changed:** `js/objects/player.js`.

- **Torso:** y is now `Player.hipY + Player.torsoHeight / 2`. It was `Player.torsoHeight / 2`.
- **Legs:** x is `±Player.legSpacing`, y is `Player.hipY - Player.legLength / 2`. They were at the torso's
  edges and at `-Player.legLength / 2`, below the floor.
- **Feet:** new, one box per leg, on the floor.
- **Arms:** each side now gets its own `shoulder` pivot at `(±Player.shoulderX, Player.shoulderY, 0)`,
  with the upper arm hanging below it, an `elbow` pivot at the bottom of the upper arm, and the lower arm
  hanging below the elbow. Before, there was one shoulder object for both sides and all four arm boxes were
  placed above shoulder height.
- The function body is indented, and each part has a comment saying where it is measured from.

**Why:** the parts appeared but in the wrong places: half the body under the floor, the arms pointing up,
and both arms attached to one shoulder that ended up on one side.

**How it works:**

- Everything is positioned from the player's origin, the point on the floor between the feet, stacking
  upward with the heights from the constants:

  | Part | From y | To y | Centre y (what `position.y` is set to) |
  | --- | --- | --- | --- |
  | foot | 0 | 0.08 | `footHeight / 2` |
  | leg | 0.08 | 0.88 | `hipY - legLength / 2` |
  | torso | 0.88 | 1.46 | `hipY + torsoHeight / 2` |
  | head | 1.48 | 1.80 | `headY` |

  A box and a sphere are positioned by their centre, so each one sits half its size above the height where
  it starts, or half its size below the height where it ends.
- **Feet:** `z = (footLength - legWidth) / 2` puts the heel under the back of the leg and lets the rest of
  the foot stick out forward. Forward is +z, the direction of the hoop.
- **Arms:** the old code changed one shoulder object's position twice in a loop, so it kept only the last
  value. Now the loop creates a new shoulder on each pass, one per side.
  - The shoulder is an empty `Object3D` at the joint. The upper arm is its child at
    `y = -upperArmLength / 2`, so the arm's top end is exactly at the joint and the arm hangs down.
  - The elbow is another empty `Object3D`, a child of the shoulder at `y = -upperArmLength`, the bottom of
    the upper arm. The lower arm is its child at `y = -forearmLength / 2`.
  - The arm positions are small numbers because they are measured from their parent, not from the floor:
    three.js adds the levels together (player, shoulder, elbow, arm).
  - Rotating a shoulder swings the whole arm from the shoulder; rotating an elbow bends only the lower arm.
    Nothing rotates them yet, so the arms hang straight down.
- The elbow pivots were not asked for separately. They are in because the lower arm needs a parent to hang
  from, and placing it under an elbow now avoids re-parenting it when the arms have to bend.
- `createPlayer()` still returns only the `player` container, so `script.js` did not change. The shoulders
  and elbows are not handed out yet; that comes when something has to pose the arms.

## 2026-10-06: outlines on the player

**What changed:** `js/objects/player.js`.

- Two imports: `Outline` from the constants and `createOutlineMesh` from the helper.
- Every body part gets an outline shell, added as a child of that part's mesh and named after it:

  | Part | Outline geometry | Outline mesh |
  | --- | --- | --- |
  | head | `headOutlineGeometry` | `headOutlineMesh` |
  | torso | `torsoOutlineGeometry` | `torsoOutlineMesh` |
  | leg (each) | `legOutlineGeometry` | `legOutlineMesh` |
  | foot (each) | `footOutlineGeometry` | `footOutlineMesh` |
  | upper arm (each) | `upperArmOutlineGeometry` | `upperArmOutlineMesh` |
  | lower arm (each) | `lowerArmOutlineGeometry` | `lowerArmOutlineMesh` |

**Why:** the art direction gives every object a dark cartoon outline. Without it the player looked
unfinished next to the hoop, and because every part has the same colour, the outline is also what makes the
head, arms and legs readable as separate shapes.

**How it works:**

- It is the same technique as on the hoop. For each part a second geometry is made in the same shape,
  `Outline.thickness` bigger on every side: a box gets `+ Outline.thickness * 2` on each of its three sizes
  (once per opposite side), and the head's sphere gets `+ Outline.thickness` on its radius.
- `createOutlineMesh` gives that geometry a dark material that only draws the inside walls
  (`side: THREE.BackSide`). The half of the shell in front of the part is invisible, and the half behind it
  shows as a dark edge around the part's silhouette.
- Each shell is a child of its own part, so it needs no position: it sits exactly around the part. For the
  arms that matters most. The upper arm's shell follows the shoulder pivot and the lower arm's shell follows
  the elbow pivot, so the outlines will bend with the arms.
- The legs, feet and arms are made inside loops that run once per side, so each side gets its own shell
  from the same lines of code.
- Where two parts touch (legs under the torso, upper arm against lower arm), each shell is partly inside
  its neighbour and hidden there, so there is no line at the joint. The outline appears where a part's edge
  has something else behind it.
- The thickness and the on/off switch are the shared ones in `constants/outline.js`, so the player's
  outlines change together with the hoop's and the court's.

## 2026-10-06: player hands out its joints, and a debug arm test

**What changed:**

- `js/objects/player.js`:
  - `createPlayer()` collects the shoulder and elbow pivots in a `joints` object
    (`joints.left.shoulder`, `joints.left.elbow`, and the same for `right`) and returns
    `{ player, joints }`. It used to return only the `player` container.
  - Which side is which was swapped: the pivot on the +x side is now stored as `left`, the one on the -x
    side as `right`.
- `js/script.js`:
  - reads both from the result (`player.player` for the container, `player.joints` for the pivots);
  - new function `makeArmTest(joints)`, marked `DEBUG ONLY`, called once in `init`. It adds two folders to
    the lil-gui panel, "left arm (debug)" and "right arm (debug)", each with four sliders.

**Why:**

- The pivots were created inside a loop and then lost, so nothing outside `createPlayer()` could turn
  them. Mirroring the webcam's arm movement, and later a shooting animation, both need to reach them.
- Testing by hand comes before connecting the webcam. If an arm moves wrongly with the webcam attached,
  the cause could be the character or the angle mapping. Sliders settle the first one on their own.
- The sides were swapped because left and right are from the player's point of view. The player faces +z,
  towards the hoop. A camera looking down -z has +x on its right; turn around to face +z and +x is on the
  left.

**How it works:**

- Returning an object with two things in it is the pattern the Aviator's `createSea()` uses
  (`{ mesh, animate }`).
- `gui.addFolder(name)` makes a collapsible group in the debug panel. Each `folder.add(object, property,
  min, max, step)` makes a slider bound to a number on an object.
- lil-gui reads and writes a property on an object, so each arm has a small `pose` object holding the four
  slider values in degrees. `.onChange(...)` runs every time a slider moves, and copies the value to the
  pivot's rotation, converted with `THREE.MathUtils.degToRad` because three.js rotations are in radians.
- Each pivot gets two sliders, for two different axes:
  - `rotation.x` turns around the left-right axis, so the arm swings forward and back;
  - `rotation.z` turns around the front-back axis, so the arm swings out to the side and up. This is the
    plane the webcam sees, so it is the axis the mirroring will use.
- At 0 on every slider the arms hang straight down, which is how they are built.
- The shoulder sliders turn the shoulder pivot, which carries the upper arm, the elbow pivot and the lower
  arm. The elbow sliders turn only the elbow pivot, which carries only the lower arm.
- Nothing in the game reads the sliders. To remove the test, delete `makeArmTest` and its call.

## 2026-10-06: the webcam switches the player between a loaded and a release pose

**What changed:**

- `js/constants/player.js`: new `Player.poses`, with two poses, `loaded` and `release`. Each has, for the
  left and the right arm, four rotations in degrees: `shoulderX`, `shoulderZ`, `elbowX`, `elbowZ`. The
  values were set by hand with the arm test sliders:

  | Pose | Arm | shoulder x | shoulder z | elbow x | elbow z |
  | --- | --- | --- | --- | --- | --- |
  | loaded | left | -30 | 0 | -50 | -10 |
  | loaded | right | -50 | 25 | -50 | 0 |
  | release | left | -115 | 0 | -75 | -25 |
  | release | right | -130 | 15 | 0 | 0 |

- `js/motionDetection.js`: `motionDetection` takes a function as its parameter and stores it in `onPose`.
  In `detect`, after both arms are measured, it calls `onPose([left, right])`.
- `js/script.js`:
  - `joints` is now a variable at the top of the file, filled in `init`. It was a local `const` inside
    `init`.
  - new function `applyPose(pose)`, which sets the four rotations on both arms.
  - `handlePose` (written by hand earlier) calls `applyPose` where it used to `console.log`: the loaded
    pose when both arms are loaded, the release pose when at least one arm is released.
  - `motionDetection(handlePose)`: the handler is passed in.
  - imports `Player`.

**Why:** this is the first connection between the webcam and the character. The webcam only sees a flat
picture, so real arm positions cannot be copied into 3D. Instead the two key moments of a shot were posed
by hand in full 3D, and the webcam decides which one to show. There is no blending between the poses yet;
the arms jump from one to the other. Smoothing is the next step.

**How it works:**

- **Getting data out of the motion file.** The detection never ends and produces new measurements every
  frame, so it cannot `return` them. `script.js` hands in a function instead (a callback), the motion file
  keeps it in `onPose`, and calls it each frame with the two arms in an array. `if (onPose)` means the
  motion code still works when no function is passed. The function is written in `script.js`, so it can
  reach `joints`; the motion file knows nothing about the player.
- **`joints` moved to the top of the file** because `handlePose` and `applyPose` are defined outside
  `init` and need to reach it. A `const` inside `init` only exists inside `init`.
- **`handlePose(arms)`** receives `[left, right]`. An arm is `null` when the model cannot see it well
  enough, so `arm?.loaded` is used: it reads `.loaded` only if there is an arm.
  - `arms.every((arm) => arm?.loaded)` is true only when both arms are loaded.
  - the loop sets `released` when at least one arm is released.
  - when neither is the case, nothing is changed, so the arms stay in the last pose they were given.
- **`applyPose(pose)`** goes through `'left'` and `'right'`, takes that side's pivots from `joints` and
  that side's values from the pose, and writes them to `rotation.x` and `rotation.z` of the shoulder and
  the elbow, converted from degrees to radians.
- **The left and right values differ** because the two arms do different jobs in a shot: the right arm is
  the shooting arm and ends up straight (elbow 0), while the left is the guide hand and stays bent. Their
  z values also have opposite meaning, since the arms mirror each other.
- The poses are in the constants, not in `script.js`, because they are data to tune, and the smoothing
  step will read the same values.
- The arm test sliders still work, but they do not move when a pose is applied, and the next pose from the
  webcam overwrites what a slider set.

## 2026-10-09: hoop sensors compare against the ball's collider handle

**What changed:**

- `js/physics.js`:
  - the ball's collider is now kept in a variable, `ballCollider`, and returned from `createPhysics()`
    together with the rest;
  - `sensorOutput` takes `ballCollider` where it took `ballBody`, and its four comparisons use
    `ballCollider.handle` where they used `ballBody.handle`.
- `js/script.js`: `ballCollider` is added to the physics variables, filled from `createPhysics()`, and
  passed to `sensorOutput`.

**Why:** the hoop sensors never reported the ball. Their checks compared the handles from a collision
event with `ballBody.handle`, and that is not the number the event contains.

**How it works:**

- In Rapier a rigid body and its collider are two separate objects. The body holds the movement (position,
  velocity, mass); the collider is the shape attached to it that touches other things. Each has its own
  `handle`, a number Rapier uses to identify it, and the two are counted separately.
- `eventQueue.drainCollisionEvents((handle1, handle2, started) => ...)` reports two **collider** handles.
  So the ball has to be recognised by its collider's handle. Comparing with the body's handle would only
  match by accident, if the two numbers happened to be equal.
- `world.createCollider(desc, ballBody)` returns the collider it creates. That return value was thrown
  away before; storing it in `ballCollider` is what makes its handle available.
- `ballBody` is still used everywhere the ball is moved or read (`setLinvel`, `translation()`,
  `setBodyType`), because those belong to the body.
- Still open in `sensorOutput`, not part of this change: the sensor side of the comparison uses
  `sensors.top` and `sensors.bottom`, which are collider objects, where it needs their `.handle`; and the
  function's `return` is inside the callback, so the function itself returns nothing.

## 2026-10-09: functions in script.js regrouped

**What changed:** `js/script.js`. The functions were moved into groups, each under a comment header. No
line of code was changed, added or removed; only the order, and six header comments.

| Group | Contains |
| --- | --- |
| poses and arms | `poseHold`, `poseUntil`, `handlePose`, `updateArms`, `lerp`, `handPoint` |
| jump | `startJump`, `updateJump` |
| shot | `shoot` |
| setup | `init` |
| helpers | `resizeRendererToDisplaySize`, `makeAxisGrid` |
| the loop | `render` |

The imports and the variables stay at the top, and the three lines that start everything stay at the
bottom.

**Why:** functions that work together had drifted apart as the file grew. `updateArms` was at the top
while `lerp`, which it calls, was fifty lines further down, and `handlePose`, which sets the pose that
`updateArms` moves towards, was further still.

**How it works:**

- The order of function definitions does not affect what the program does here. A function's body only
  runs when the function is called, and nothing is called until the last three lines of the file
  (`init()`, `await renderer.init()`, `renderer.setAnimationLoop(render)`). By then every function above
  them has been defined.
- So `handlePose` can call `startJump` and `shoot` even though they are defined below it.
- This only holds because the calls are at the bottom. A `const` function cannot be called on a line
  above its definition while the file is first being read.
- Checked by comparing the file before and after: the same 226 lines of code, each the same number of
  times, and the project still bundles.

## 2026-10-09: the ball's fire is three nested cylinders

**What changed:** `js/objects/basketball.js`. Below the existing fire cylinder, two more are created in a
loop over a small `innerFlames` list:

| Flame | Radius | Raised by | Turned around y |
| --- | --- | --- | --- |
| first (already there) | `Basketball.radius` | 0 | 0 |
| second | `Basketball.radius * 0.66` | 1 radius | 108° (`Math.PI * 0.6`) |
| third | `Basketball.radius * 0.33` | 2 radii | 234° (`Math.PI * 1.3`) |

All three have the same height (`fireHeight`) and use the same material, `cilinderMaterial`.

**Why:** one cylinder is a flat picture of a flame rolled into a tube. Seen from the side it looks like a
sheet around the ball with nothing inside. Flames at three depths, the inner ones reaching higher, give the
fire a body: from any angle there are flames in front of and behind each other, and the middle rises to a
point.

**How it works:**

- A material can be shared by several meshes, the same way one geometry was shared by the sun, earth and
  moon. The fire material holds the shader (`colorNode = fireFn(...)`) with its two uniforms, `fireTime`
  and `fireHeat`. Because the three cylinders share it, updating `fire.time.value` and `fire.heat.value`
  in `script.js` drives all of them, and nothing there had to change.
- Each inner cylinder needs its own geometry, because its radius differs. The height, the 32 sides and the
  open ends (`true`, so no top and bottom discs) are the same as the first one's.
- A cylinder is centred on its middle, so `fireHeight / 2` puts its base at the ball's centre, as for the
  first one. `+ flame.lift` then moves the whole tube up, so the narrower flames start and end higher.
- The shader draws the flame from the cylinder's own texture coordinate, which runs 0 to 1 around it. Three
  cylinders with the same coordinate would show the same flame at the same angle, just smaller, like rings
  of one picture. `rotation.y` turns each one by a different amount, so their tongues are at different
  places around the ball.
- The material uses additive blending, so where flames overlap on screen their light adds up. The centre
  of the fire, where up to three tubes are behind each other, is therefore brighter and whiter than the
  edge. If that is too much, lowering `fireHeat` dims all three.
- Everything is a child of the `basketball` group, so the fire follows the ball and stays upright.

## 2026-10-09: inner flames keep the first flame's centre and are taller

**What changed:** `js/objects/basketball.js`, the `innerFlames` list and the loop under it.

- Each inner flame now has a `height` where it had a `lift`: the second is `fireHeight + 2 radii` tall,
  the third `fireHeight + 4 radii`.
- All three cylinders are at the same `position.y`, `fireHeight / 2`. The inner ones used to be at
  `fireHeight / 2 + lift`.
- The radii and the turns are unchanged.

**Why:** the inner flames were the same height as the outer one and only moved upward, which left their
lower ends hanging above the ball's centre. They are meant to share the first flame's centre and differ in
how tall they are.

**How it works:**

- A cylinder is positioned by its centre and grows equally in both directions from it. With the same centre
  for all three, a taller cylinder reaches further up and equally further down:

  | Flame | Height | Top above the ball's centre | Bottom |
  | --- | --- | --- | --- |
  | first | 7 radii | 7 radii | at the ball's centre |
  | second | 9 radii | 8 radii | 1 radius below the centre |
  | third | 11 radii | 9 radii | 2 radii below the centre |

  The tops are at the same heights as before this change, since each flame gained twice what it used to be
  lifted by.
- The shader draws the flame across the cylinder's full height (its texture coordinate runs 0 at the bottom
  to 1 at the top), so a taller cylinder shows a taller, more stretched flame, starting from its own bottom
  edge.
- The parts below the ball's centre are mostly inside the ball and hidden by it. The third flame's lower
  end reaches 2 radii down, which is 1 radius below the bottom of the ball, so a narrow piece of it shows
  underneath.

## 2026-10-09: the five shooting spots

**What changed:** `js/constants/court.js`.

- `Court.threePoint` has a new value, `spotBehindLine` (0.5): how far outside the three-point line the
  player stands.
- Below the object, a new list `Court.spots` with five entries, built by three small helper functions
  (`makeSpot`, `makeArcSpot`, `makeCornerSpot`):

  | # | Name | x | z | Facing | Distance to the rim |
  | --- | --- | --- | --- | --- | --- |
  | 0 | left corner | 7.10 | 5.42 | -90° | 7.10 m |
  | 1 | left wing | 5.13 | 0.30 | -45° | 7.25 m |
  | 2 | top | 0.00 | -1.83 | 0° | 7.25 m |
  | 3 | right wing | -5.13 | 0.30 | 45° | 7.25 m |
  | 4 | right corner | -7.10 | 5.42 | 90° | 7.10 m |

Nothing uses the list yet, so the game is unchanged.

**Why:** the game moves the player to the next of five spots around the arc after each made shot. The
spots are positions on the court that follow from the three-point line, so they belong with the court's
constants and are calculated from the same radius and rim position the line is drawn with. If the line or
the hoop moves, the spots move too.

**How it works:**

- **Each spot** is an object with a `name`, the floor position `x` and `z`, and `facing`. The height is not
  stored: the player's origin is on the floor, so y is 0.
- **Arc spots** (`makeArcSpot(name, degrees)`): a point on a circle around the rim, the same maths as the
  three-point line. The circle's radius is the line's radius plus `spotBehindLine`. For an angle,
  `distance * cos(angle)` is how far the point is to the side (x) and `distance * sin(angle)` how far in
  front of the rim, which is subtracted from `rimZ` because "in front of the rim" is the -z direction.
  90° is straight in front of the hoop, 45° and 135° are the two wings.
- **Corner spots** (`makeCornerSpot(name, side)`): the line is straight there, at `x = ±cornerX`, so the
  spot is `spotBehindLine` further out than that, level with the rim (`z = rimZ`). `side` is 1 or -1.
- **Left and right** are the player's own while facing the hoop. The player faces +z, so its left is the
  +x side, the same convention as the player's arms.
- **`facing`** is the rotation around y that turns the player towards the rim:
  `Math.atan2(0 - x, rimZ - z)`. `atan2` takes the two sides of a triangle, here how far the rim is to the
  side and how far ahead, and returns the angle, for any direction. An unrotated player faces +z, which is
  angle 0, so the value can be used directly as `player.rotation.y`.
- **The order** in the list is the order of play: corner, wing, top, wing, corner. After the last one the
  game goes back to the first, which is `(index + 1) % Court.spots.length`.
- The spots are created after the `Court` object for the same reason as `rimZ`: they read `Court`'s own
  values, which only exist once the object is complete.
- Checked by printing the list: all five are inside the court (15 x 14) and 7.10 to 7.25 m from the rim.

## 2026-10-10: the ball lands, shrinks away and grows back in the hand

**What changed:**

- `js/constants/basketball.js`: three new values in `Basketball`: `shrinkTime` (0.6 s), `growTime` (0.2 s)
  and `landingWait` (1.5 s).
- `js/script.js`:
  - `ballState` has two more states. It was `held` or `flying`; now also `landing` and `shrinking`.
  - two new variables, `ballScale` (1 = full size, 0 = gone) and `landingTime`.
  - `shotReset()` no longer uses a 600 ms `setTimeout`. It sets `ballState` to `landing` and clears
    `landingTime`.
  - new function `updateBallReturn(delta)`, called every frame from `render`, after `updateJump(delta)`.

**Why:** after a make or a miss the ball used to jump straight back into the hand 0.6 s later, wherever it
was at that moment. That looked like a glitch. Now the ball finishes its fall, bounces, shrinks to nothing
and reappears in the hand by growing, so there is no visible jump at either end.

**How it works:**

- A change of size over time has to be done a little every frame. A `setTimeout` can only do one thing
  once, later, so the timer was replaced by a state that `render` advances.
- The ball's life is now a loop of four states:

  | State | Meaning | Ends when |
  | --- | --- | --- |
  | `held` | in the player's hand, follows it | a shot is released |
  | `flying` | in the air, the shot is undecided | a make or a miss is decided, which calls `shotReset()` |
  | `landing` | decided, still a normal bouncing physics ball | it touches the floor, or `landingWait` has passed |
  | `shrinking` | getting smaller | its scale reaches 0 |

- **`landing`** matters for makes. A make is decided at the hoop, three metres up. Without this state the
  ball would shrink in mid-air. A miss is decided on the floor, so it passes through `landing` in one
  frame. The floor test is the same as for a miss: the ball's centre is within one radius (plus 2 cm) of
  y = 0. `landingWait` is the way out if the ball never gets there, for example when it comes to rest on
  the rim.
- **`shrinking`**: each frame `ballScale` goes down by `delta / Basketball.shrinkTime`. `delta` is the
  frame's length in seconds, so the scale goes from 1 to 0 in exactly `shrinkTime` seconds on any screen.
  `Math.max(0, ...)` stops it at 0. At 0 the ball becomes `held` and its body is switched back to
  kinematic, so from the next frame it follows the hand again.
- **Growing back**: while `held`, a scale below 1 goes up by `delta / Basketball.growTime` per frame,
  stopped at 1 by `Math.min`.
- `basketball.scale.setScalar(...)` sets x, y and z scale to the same value. It is applied to the
  `basketball` group, so the ball, its outline shell and the fire cylinders all shrink together. The
  smallest value used is 0.001: an object scaled to exactly 0 has no size to draw.
- Only the picture changes size. The physics ball keeps its radius, so it keeps bouncing normally while it
  shrinks.
- `shoot()` already refuses to shoot unless `ballState` is `held`, so no shot can start while the ball is
  landing or shrinking.

## 2026-10-10: a missed ball shrinks from its first floor touch

**What changed:** `js/script.js`.

- New small function `ballNearFloor()`: true when the ball's centre is within one radius plus 5 cm of the
  floor.
- `shotReset()` now sets `ballState` to `"shrinking"` when the ball is near the floor, and to `"landing"`
  otherwise. It always used `"landing"` before.
- `updateBallReturn` uses `ballNearFloor()` for its landing check, where it had its own copy with a 2 cm
  margin.

**Why:** after a miss, the ball started shrinking in mid-air, up to a second and a half after it had
bounced. A miss is decided at the moment the ball touches the floor. `shotReset()` then put the ball in the
`landing` state, which waits for the ball to touch the floor. That check ran on the next frame, when the
ball had already bounced a few centimetres up, so it kept waiting: either for the second bounce, or for
`landingWait` (1.5 s) to run out, which happened while the ball was still in the air on a high bounce.

**How it works:**

- The `landing` state exists for makes, which are decided at the hoop, three metres up, and must fall
  before shrinking. A miss is already on the floor when it is decided, so it has nothing to wait for.
  `shotReset()` asks where the ball is and picks the state that fits.
- `condition ? a : b` gives `a` when the condition is true and `b` when it is false.
- After a miss the ball now shrinks during its first bounce: it starts at the floor and is gone 0.6 s
  later, on its way up.
- The margin went from 2 cm to 5 cm. The position is looked at once per frame, and a fast ball is only
  within a couple of centimetres of the floor for a very short time. A wider margin makes it less likely
  that a made ball's landing is not noticed, which would leave it to the 1.5 s timeout.
- The floor test for deciding a miss, in `checkMadeShot`, is unchanged and keeps its 2 cm margin.

## 2026-10-12: the street and the sidewalks, in a new environment file

**What changed:**

- New `js/constants/street.js` with two objects:
  - `Street`: the ground height (`groundY`, the surround's height), the length (the surround's depth, 30 m),
    the street's middle (`centreX` 14.5) and width (5 m), the dashed line (12 cm wide, 2 m dashes, 2 m
    gaps) and the zebra crossing (at z = -12, 3 m deep, 0.5 m stripes and gaps).
  - `Sidewalk`: the kerb height (0.15 m) and three strips, each a centre on x and a width: between the
    court and the street (10.75, 2.5 m), across the street in front of the future bodega (18, 2 m), and
    between the court and the future brownstones (-10.75, 2.5 m).
- New `js/objects/street.js`, exporting `createStreet()`: the asphalt, the dashed centre line and the
  zebra crossing.
- New `js/objects/sidewalk.js`, exporting `createSidewalks()`: one raised slab with an outline per strip.
- `js/environment.js` (it held an empty stub): `createEnvironment()` is now exported, puts the street and
  the sidewalks in one `THREE.Group` and returns it.
- `js/constants/colors.js`: four colours: `street`, `streetLine`, `crosswalk`, `sidewalk`.
- `js/script.js`: imports `createEnvironment` and adds its group to the scene right after the court.

**Why:** the first step of the Brooklyn block from the ground plan. The street runs along the player's
left (+x), so the court sits inside a city block and not on an empty purple field. Everything decorative
goes through `createEnvironment()`, so a performance mode can later skip the whole block with one
condition. None of it has a physics collider, so the game plays the same without it.

**How it works:**

- **Positions follow the ground plan,** in the same coordinates as the court: the court is 15 m wide
  (x -7.5 to 7.5), the street runs from x = 12 to 17, the sidewalks fill 9.5 to 12, 17 to 19 and -12 to
  -9.5, and everything runs the full 30 m depth of the surround (z -15 to 15).
- **Heights:** the surround lies at `-Court.thickness` (-0.2), which is `Street.groundY`.
  - The asphalt is a plane 1 cm above that, and the markings 2 cm above it. Two flat surfaces at exactly
    the same height flicker, because the renderer cannot decide which is in front.
  - A sidewalk is a box `Sidewalk.height` (0.15 m) tall, standing on the ground, so its centre is at
    `groundY + height / 2`. Its top is at -0.05, just below the court's surface at 0. The box's sides are
    the kerbs.
- **Planes are laid flat** with `rotation.x = -90°`, as with the court's surround, and placed by their
  centre.
- **The dashed line** is a loop that starts half a dash in from one end of the street and steps
  `dashLength + dashGap` (4 m) at a time, putting one dash at each step: 8 dashes over 30 m. All dashes
  share one geometry and one material.
- **The zebra crossing** is a second loop. It first works out how many stripes fit across the 5 m street
  with a gap left over (4), then centres that group, so both kerbs keep the same margin (0.75 m). The
  stripes run along the street, side by side across it, the way a crossing is painted.
- **Sidewalk outlines** use `createOutlineMesh` like the court's floor: the same box,
  `Outline.thickness` bigger on every side, as a child of the sidewalk mesh.
- **Lighting:** the materials use `emissive` with `SelfLight`, the same as the court and the surround, so
  the new surfaces are as bright as the ground they lie on.
- **`THREE.Group`** is an `Object3D` meant only for grouping. It works the same as the empty `Object3D`
  containers elsewhere; adding or leaving out that one group adds or removes everything in it.

## 2026-10-12: sidewalks changed to beige

**What changed:** `js/constants/colors.js`, `sidewalk` from `0x8C82A0` (greyish lilac) to `0xC8A27C`
(sandy beige). The old value is in the comment on that line.

**Why:** the sidewalks came out almost white on screen. A warm beige fits the sunset palette better and
sets the walkways apart from the purple surround and the dark street.

**How it works:** `createSidewalks()` builds its material from `Colors.sidewalk`, so this one value
recolours all three strips. The sidewalks look lighter on screen than the hex value, because their
material adds its own colour on top of the light it receives (`emissive` at `SelfLight` = 1) and the
directional light is strong (intensity 15). On faces that point up at the light, light colours are pushed
towards white.

## 2026-10-12: street trees

**What changed:**

- New `js/constants/tree.js` with a `Tree` object: the trunk's size, the crown's cubes (3 to 4 of them,
  1.0 to 1.6 m), how far they can spread, rise and tilt, and how trees are placed along the sidewalks
  (slots of 6 m, a 70% chance per slot, up to 1.5 m off the slot's middle).
- New `js/objects/tree.js`, exporting `createTree()` (one tree) and `createTrees()` (rows of trees along
  every sidewalk strip).
- `js/constants/colors.js`: `treeTrunk`, `treeLeaves` and `treeLeavesDark`.
- `js/environment.js`: adds `createTrees()` to the environment group.

**Why:** the next piece of the Brooklyn block from the ground plan. Street trees soften the hard edges of the
street and the sidewalks. Big cubes as leaves keep them low-poly and cartoon-like, in line with the rest.

**How it works:**

- **One tree** (`createTree`) is built around its own origin, the point on the ground where the trunk
  stands, like the player and the hoop:
  - the trunk is a tall thin box, lifted by half its height so it stands on the origin;
  - the crown is a loop that makes 3 or 4 cubes. Each gets a random edge length, a random place around the
    top of the trunk (`leafSpread` sideways, up to `leafRise` above), and a random angle: a little tipped
    over on x and z (`leafTilt`), and any turn up to 90° around y. A cube looks the same every 90°, so a
    quarter turn covers every orientation.
  - the cubes alternate between two greens (`i % 2`), so neighbouring cubes stand apart;
  - every part gets an outline: the same box, `Outline.thickness` bigger on every side, as a child, so the
    outline turns along with a tilted cube.
- **`randomBetween(min, max)`** gives a random number in a range: `Math.random()` is between 0 and 1, so
  `min + Math.random() * (max - min)` is between min and max.
- **Placing them** (`createTrees`): random positions could put two trees inside each other, or none along a
  whole stretch. So each sidewalk strip is cut into slots of `slotLength` along z (5 slots over 30 m).
  Every slot gets at most one tree, near its middle and moved by up to `slotJitter`, so trees are always
  at least 3 m apart. `Tree.chance` leaves some slots empty, so the rows have gaps.
  - each tree stands on top of the sidewalk: `Street.groundY + Sidewalk.height`;
  - the whole tree is turned to a random angle around y, so the crowns face different ways.
- **The layout is different on every page load**, because `Math.random()` gives new numbers each time.
- **Materials are shared:** one for all trunks and two for all leaves, created once outside the functions.
  Only the geometries differ per cube, because their sizes differ.
- The leaves have `castShadow`, so trees near the court can drop shadows on it. The trunks and outlines
  do not.

## 2026-10-12: chain-link fence around the court

**What changed:**

- New `js/constants/fence.js` with a `Fence` object: the rectangle it stands on (x -8.5 to 8.5, z -8 to
  9), the heights (3.5 m, and 5.5 m behind the hoop), the gate (a gap from z -6.5 to -5 in the street
  side), the posts and the top rail, and the wire pattern (one diamond every 15 cm, drawn on a 64 x 64
  pixel canvas with a 5 pixel wire).
- New `js/objects/fence.js`, exporting `createFence()`.
- `js/constants/colors.js`: `fenceWire` and `fencePost`.
- `js/environment.js`: adds the fence to the environment group.

**Why:** a caged street court is one of the clearest signs of a Brooklyn setting, and the ground plan put it
in tier 1. The pattern is drawn by code, so no image had to be found, licensed or added to the project.

**How it works:**

- **The diamond.** `createDiamondCanvas()` makes a `<canvas>` element that is never added to the page,
  and draws one diamond on it with `moveTo`, `lineTo` and `stroke`: four lines through the middles of the
  canvas's edges. Only the wire is painted; the rest of the canvas stays transparent. When the square is
  repeated, the halves at its edges meet those of the next square, so the pattern continues as a mesh.
  A canvas wants a CSS colour string, so the hex number from `Colors` is turned into one:
  `'#' + Colors.fenceWire.toString(16).padStart(6, '0')`.
- **The texture.** `THREE.CanvasTexture(diamondCanvas)` uses that canvas as a texture. `RepeatWrapping`
  and `repeat.set(length / diamondSize, height / diamondSize)` tile it across a side so that each diamond
  is 15 cm, however long the side is. Each side gets its own texture object, because its repeat count
  depends on its size, but they all share the one canvas.
- **The holes.** The material has `alphaTest: 0.5`: every pixel that is less than half solid is not drawn
  at all. That makes the transparent parts real holes. It is used instead of `transparent: true`, which
  blends and has to sort overlapping see-through surfaces, and the fence overlaps nearly everything.
  `side: THREE.DoubleSide` shows the mesh from inside and outside the court.
- **One side** (`createSide(a, b, height)`) runs straight from point `a` to point `b` on the ground:
  - its length is `Math.hypot(dx, dz)`, and its middle is halfway between the two points;
  - `angle = Math.atan2(-dz, dx)` is how far to turn something that lies along x so it lies along the
    side. Checked for all five sides: the turned plane's width points exactly along each one;
  - the wire mesh is a `PlaneGeometry(length, height)`, which is made standing up with its width along x,
    turned by `angle` around y and lifted by half its height;
  - posts are cylinders at both ends and evenly in between, never more than `postSpacing` (3 m) apart:
    `Math.ceil(length / postSpacing)` gaps, so a 17 m side gets 7 posts;
  - the top rail is a cylinder, which is made standing along y. `rotation.set(0, angle, Math.PI / 2)`
    first lays it down along x (the z rotation), then turns it to follow the side (the y rotation): with
    the default rotation order, three.js applies z before y.
- **The whole fence** is five sides: the tall one behind the hoop, the camera end, the brownstone side, and
  the street side in two parts with the gate between them.
- Posts and rails have outlines and the lit, self-lit material used elsewhere. The wire mesh has neither:
  an outline shell would be a solid box, and `MeshBasicMaterial` keeps the wire one flat colour.
- The fence has no collider, like the rest of the environment, so a long miss flies through it.
- Where two sides meet, both place a post at the corner, so the corners have two posts in the same spot.
  They overlap exactly and look like one.

## 2026-10-12: buildings on both sides of the block

**What changed:**

- New `js/constants/buildings.js` with a `Buildings` object: the storey height, the window grid (3 per
  storey, 0.9 x 1.4 m, a 35% chance to be lit), the cornice, the brownstone row (5 houses of 5 m, 10 to
  13 m tall, fronts at x = -13 facing the court, with stoops), the three buildings across the street (fronts
  at x = 19, the first one the bodega), and the water towers on three roofs.
- New `js/objects/buildings.js`, exporting `createBuildings()`.
- `js/constants/colors.js`: three building colours, the bodega's blue, the cornice, lit and dark windows,
  the door, the awning, the sign and the water towers.
- `js/environment.js`: adds the buildings to the environment group.

**Why:** the brownstones and the corner bodega from the ground plan. They close the block on both sides, so
the court sits in a street, and they carry most of the Brooklyn look. They were kept simple on purpose:
each building is one box, with the detail painted on its front.

**How it works:**

- **One building is a box** the size of the building, with a ledge (the cornice) on top. Its front stands at
  `frontX` and its body goes backwards, away from the court. `facing` is +1 when the front looks towards
  +x (the brownstones) and -1 when it looks towards -x (across the street), so the centre is
  `frontX - facing * depth / 2` on both sides.
- **The windows are painted, not built.** `paintFront()` draws the front on a canvas the size of the
  building (24 pixels per metre): the wall colour, then one window per storey per column, each lit or dark
  at random, then a door (brownstones) or a shop with a sign (the bodega). That canvas becomes the texture
  of the front only. A box accepts six materials, one per side, in the order +x, -x, +y, -y, +z, -z, so
  the front gets the painted material and the other five a plain wall material.
  - A canvas measures y from the top and a building from the ground, so `fromGround(metres)` turns a
    height into canvas pixels: `canvas.height - metres * ppm`.
  - Painting the windows keeps every building at a handful of meshes, where real window boxes would add
    dozens of objects per building.
- **The front's material** is lit and self-lit with the canvas (`map` and `emissiveMap`), the same way the
  court floor uses its texture, so the painted colours come out as bright as the plain walls.
- **Stoops** are 4 boxes in front of each brownstone's door. Step 0 is against the front and the highest;
  each next one is one step lower and one step further out, so together they form a staircase.
- **The bodega** has a lit shop window, a door, a hot pink sign band reading "DELI · GROCERY", and a lime
  awning: a thin slab sticking out over the window.
- **Water towers** are four thin legs, a wooden barrel and a cone roof, placed on the roof of the chosen
  buildings. Each building stores the middle of its roof in `userData.roof` so the tower can be put there.
- **Shared materials:** `plainMaterial(color)` keeps one material per colour in a `Map` and hands out the
  same one every time, so all walls of one colour share it.
- `css(color)` turns a palette number like `0x9a5b44` into the text `'#9a5b44'` a canvas needs.
- Window lights and brownstone heights are random, so they differ on every page load.
- Every box has an outline. The buildings have no collider and cast no shadows.

## 2026-10-12: the bodega removed

**What changed:**

- `js/objects/buildings.js`:
  - `paintFront()` no longer paints a shop window, a door, a sign band or the "DELI · GROCERY" text, and
    no longer leaves a ground floor empty for a shop. Only a brownstone skips its middle ground-floor
    window, for its door.
  - `createBuilding()` no longer adds an awning.
  - `createBuildings()` builds every building across the street as a plain building.
- `js/constants/buildings.js`: the first building across the street is a plain one now: brown, 8 m tall
  (it was the 7 m blue bodega). The `bodega: true` flag and its comment are gone.
- `js/constants/colors.js`: `bodega`, `awning` and `sign` are removed, since nothing uses them any more.
- `js/constants/street.js`: the far sidewalk's comment no longer mentions the bodega.

**Why:** the corner shop was taken out of the design. The buildings across the street are now plain
buildings with windows, like the brownstones but without stoops.

**How it works:** `kind` now has two values. `'brownstone'` gets a door painted on the front, a gap in the
ground-floor windows for it, and a stoop. `'plain'` gets only the window grid. Everything else about a
building (the box, the painted front, the cornice, the water towers) is unchanged.

## 2026-10-12: the elevated train track

**What changed:**

- New `js/constants/track.js` with a `Track` object: where the line runs (along x, the full 50 m of the
  surround, centred at z = 13.9), the deck (6 m up, 2.2 m wide, 0.6 m thick), the columns (pairs every
  5 m, 0.35 m square), the rails (1.4 m apart) and the sleepers (one every 0.6 m).
- New `js/objects/track.js`, exporting `createTrack()`.
- `js/constants/colors.js`: `trackSteel`, `trackDeck`, `trackSleeper` and `trackRail`.
- `js/environment.js`: adds the track to the environment group.

**Why:** the elevated train from the ground plan, the "El" that runs over the streets in Bushwick and
Williamsburg. It stands behind the hoop, so it is in view above the fence in every shot, and it is one of
the most recognisable parts of a Brooklyn street. There is no train on it yet.

**How it works:**

- **Where:** the deck runs from z = 12.8 to 15, behind both rows of buildings (which end at 12.5) and
  inside the surround (which ends at 15), and from x = -25 to 25. It is in the same coordinates as
  everything else, so it crosses the street, and one pair of columns stands in the street at x = 12.5, as
  real El columns do.
- **The deck** is one long box. A box is centred on its middle, so to put its top at `deckY` it is placed
  at `groundY + deckY - deckThickness / 2`.
- **The sleepers** are painted, like the fence's diamonds: `createSleeperTexture()` draws one sleeper on a
  canvas that covers 0.6 m of track and the deck's full width, and `RepeatWrapping` with
  `repeat.set(length / sleeperSpacing, 1)` repeats it 83 times along the deck and once across. Only the
  top of the deck gets this material: a box takes six materials in the order +x, -x, +y, -y, +z, -z, and
  the top is +y, the third. The other five sides are plain steel.
- **The columns** are placed by a loop along x, starting half a spacing in from the end so the pairs are
  centred along the track: 10 pairs at x = -22.5, -17.5, ... 22.5. Each pair stands under both edges of
  the deck, a column's width in from the edge (z = 13.15 and 14.65). They reach from the ground to the
  underside of the deck, `deckY - deckThickness` tall, and are placed by their middle.
- **The rails** are two long thin boxes lying on top of the deck, `railGauge / 2` either side of its middle
  line, lifted by half their height so they rest on the deck.
- Every box has an outline. Nothing has a collider or casts a shadow.

## 2026-10-12: the mural wall behind the hoop

**What changed:**

- New `js/constants/wall.js` with a `Wall` object: where it stands (centred at z = 10.25, between the fence
  and the train track), its size (19 m wide, 4.5 m high, 0.5 m thick), the cap on top, and the painted
  face (40 pixels per metre, the brick size, and the text "HEAT CHECK" at 2 m tall).
- New `js/objects/wall.js`, exporting `createWall()`.
- `js/constants/colors.js`: `wallBrick` and `wallMortar`.
- `js/environment.js`: adds the wall to the environment group.

**Why:** the camera looks towards the hoop, so the strip behind the backboard is in every shot. A painted
brick wall there is the strongest single sign of a street court, and it puts the game's name into the
world itself. In the ground plan it is also the spot marked for a possible second shader.

**How it works:**

- **The wall** is a box with a cap (the coping) on top, like the buildings' cornice. Only its face towards
  the court gets the mural. That face is -z, because the camera stands at the -z end looking towards the
  hoop. A box takes six materials in the order +x, -x, +y, -y, +z, -z, so the mural is the sixth. Box faces
  are made so that their textures read the right way round from outside, so the letters are not mirrored.
- **`paintMural()`** paints the face on a canvas the size of the wall, in layers. Each layer is painted
  over the one before:
  1. **Bricks:** the whole canvas in mortar colour first, then one brick rectangle per row and column, each
     smaller than its cell by the mortar width, so the mortar shows between them. Every other row starts
     half a brick to the left (`row % 2`), which gives the staggered pattern of a real wall.
  2. **Background shapes:** a big sunset-orange disc (`arc`) and two broad swooshes in the court's teal and
     the key's pink. A swoosh is one curved line (`bezierCurveTo`) drawn twice: first wide and dark for its
     border, then a little narrower in its own colour on top.
  3. **The name:** "HEAT CHECK" in a heavy font. `translate` and `rotate` move the canvas's origin to the
     middle of the wall and tilt it a little, so the letters look painted by hand. It is drawn three
     times: a pink copy shifted down and right (the 3D shadow), a thick dark outline (`strokeText`), and the
     yellow fill on top (`fillText`). `save()` and `restore()` undo the tilt afterwards.
  4. **Drips:** six thin rectangles with a round blob at the bottom, hanging under the letters at fixed
     spots along `measureText(...).width`, the width of the text. They are not random, so the mural looks
     the same every time.
- **The material** uses the canvas as `map` and `emissiveMap`, like the buildings' fronts, so the mural's
  colours come out as bright as the walls around it.
- The font is Impact, with Arial Black and any heavy sans-serif as fallbacks: a canvas can only use fonts
  the browser already has, and these are on nearly every system.
- The wall has an outline and no collider. A long miss can fly through it.

## 2026-10-12: the mural wall is beige concrete, not brick

**What changed:**

- `js/objects/wall.js`: the first layer of `paintMural()` paints plain beige concrete with thin vertical
  joints between panels, where it painted a brick pattern. The wall's other five sides use the concrete
  colour too.
- `js/constants/wall.js`: `brickWidth`, `brickHeight` and `mortarWidth` are replaced by `panelWidth`
  (3.2 m) and `jointWidth` (5 cm). The comment says concrete.
- `js/constants/colors.js`: `wallBrick` and `wallMortar` are replaced by `wallConcrete` (`0xE3CFA8`, a
  light beige, lighter than the sidewalk) and `wallJoint` (`0xC4AC86`, a darker beige).

**Why:** red brick made the wall heavy and busy behind the mural. A calm, light beige surface lets the
painted shapes and the name stand out, and fits the flat cartoon look.

**How it works:**

- The canvas is filled with the concrete colour, then a thin joint is drawn every `panelWidth`, the seams
  between cast concrete panels. The first joint is at `(w / 2) % panel`: the remainder of half the wall's
  width divided by a panel's width. That puts a joint pattern that is centred on the wall, so both ends
  look alike.
- The swooshes, the sunset disc, the "HEAT CHECK" letters and the drips are unchanged; they are painted on
  top of the concrete as before.

## 2026-10-12: the mural wall is plain purplish blue

**What changed:**

- `js/objects/wall.js`: the first layer of `paintMural()` is now only one flat fill. The loop that drew the
  vertical panel joints is gone.
- `js/constants/wall.js`: `panelWidth` and `jointWidth` are removed.
- `js/constants/colors.js`: `wallConcrete` is `0x5E5BD1`, a purplish blue (it was beige, `0xE3CFA8`), and
  `wallJoint` is removed.

**Why:** the joint lines made the wall look busy, and the beige was too close to the sidewalk. A deeper
purplish blue suits the late-90s cartoon palette and makes the mural's orange disc, pink and teal
swooshes and yellow letters stand out more.

**How it works:** the canvas is filled with `Colors.wallConcrete`, then the mural layers are painted on top
as before. The wall's other five sides use the same colour, through the same constant.

## 2026-10-12: the swooshes removed from the mural

**What changed:** `js/objects/wall.js`. `paintMural()` no longer paints the two curved bands (the teal and
the pink swoosh), and the `swoosh` helper function that drew them is gone. The comments now describe the
mural as a plain wall, a sunset disc and the name.

**Why:** the bands ran across the whole wall as long lines, which made the mural busy. Without them the
wall is the purplish blue with the orange disc and the "HEAT CHECK" letters in the middle.

**How it works:** the mural is still painted in layers on one canvas: the flat wall colour, the orange disc
with a dark edge, then the letters with their pink shadow, dark outline, yellow fill and drips. Only the
layer with the bands was taken out.

## 2026-10-12: the ground around the court is grey asphalt

**What changed:** `js/constants/colors.js`, `surround` from `0x4A3470` (purple) to `0x6F6A75`, a grey with a
slight lilac tint. The old value is in the comment on that line.

**Why:** now that the court stands in a city block, the ground between the court, the sidewalks and the
buildings reads as the ground of a lot or a schoolyard. Purple made it look like a stage floor. Grey
asphalt is what that ground is in a real street, and the touch of lilac keeps it in the palette.

**How it works:** only the surround plane in `createCourt()` reads `Colors.surround`, so this one value
changes the whole ground. It sits between the dark street (`0x2C2140`) and the light beige sidewalks in
brightness, so the three surfaces stay easy to tell apart. The cornices on the buildings had the same
purple, but they use their own `cornice` colour, so they are unchanged.

## 2026-10-12: stands at the camera end, in place of the fence

**What changed:**

- `js/objects/fence.js`: `createFence()` no longer builds the side at the camera end (z = -8). A comment
  says the stands are there now.
- `js/constants/fence.js`: the comment on `height` says it is for the two long sides only.
- New `js/constants/stands.js` with a `Stands` object: as wide as the fence (17 m), starting 0.2 m behind
  where the fence stood, 4 rows of 0.9 m deep and 0.45 m higher each, seat planks, and a railing along the
  back of the top row.
- New `js/objects/stands.js`, exporting `createStands()`.
- `js/constants/colors.js`: `standFrame` (lilac grey, like the fence posts) and `standSeat` (the pole's
  yellow).
- `js/environment.js`: adds the stands to the environment group.

**Why:** a fence across the camera end shut the court off from the viewer's side. Bleachers there give
the court an audience side that opens up towards the player, and they are a typical part of a
neighbourhood court.

**How it works:**

- **The rows** are a loop. Each row is a solid box from the ground up to that row's height, so together
  they form a staircase rising away from the court, like the brownstones' stoops:
  - row 0 is the lowest and nearest to the court, `rowRise` (0.45 m) high;
  - every next row is one `rowDepth` further back (towards -z) and one `rowRise` higher;
  - a box is placed by its middle, so a row's box is at `groundY + height / 2` up and at
    `frontZ - (row + 0.5) * rowDepth` along z.
- **The seats** are thin yellow planks on top of every row, slightly deeper than the row
  (`seatOverhang`) and shifted forwards by half of that, so they stick out over the front edge like a real
  bleacher seat.
- **The railing** stands on the top row, just inside its back edge: posts spread evenly over the width with
  one at each end (`Math.ceil(width / railPostSpacing)` gaps), and one bar along their tops. The top seat
  is 1.68 m above the court's surface and the railing reaches 2.68 m.
- The stands' width and front come from the fence's constants (`Fence.maxX - Fence.minX` and
  `Fence.minZ`), so they line up with the ends of the two fence sides and close off the cage where the
  fence used to be.
- They face the court, which is +z, towards the hoop. The menu camera stands behind and well above them
  (z = -9, 9 m up), so they are in its view without blocking the court.
- Every box has an outline. No colliders, no shadows.

## 2026-10-12: stand seats changed from yellow to pink

**What changed:** `js/constants/colors.js`, `standSeat` from `0xFFD400` (yellow) to `0xFF3D8B` (hot pink, the
same as `courtPaint`). The old value is in the comment on that line.

**Why:** the yellow seats competed with the yellow hoop pole and the yellow letters on the mural. Pink is
already part of the palette and appears on the court's key, so the seats tie in with the court without
pulling attention away from the hoop.

**How it works:** `createStands()` builds one seat material from `Colors.standSeat`, shared by all four
planks, so this one value recolours every seat.

## 2026-10-12: a cross street behind the train track, and a row of buildings behind it

**What changed:**

- `js/constants/street.js`: a new `CrossStreet` object: the street's middle (z = 19) and width (5 m), its
  ends (x -25 to 25), the widths of its two sidewalks (1.5 m and 2 m), and how far the ground behind it
  reaches (z = 33).
- New `js/objects/crossStreet.js`, exporting `createCrossStreet()`: the ground, the asphalt, the
  sidewalks and the dashed centre line.
- `js/constants/buildings.js`: a new `backRow` (7 buildings along x, fronts at z = 23.5, 8 m deep, 9 to
  15 m tall) and two more water towers on it.
- `js/objects/buildings.js`:
  - `createBuilding()` now builds a building around its own origin, the middle of its front at ground
    level, always facing +x. It takes `depth`, `length`, `height`, `color` and `kind`; it no longer takes
    `frontX`, `facing`, `fromZ` and `toZ`.
  - new `placeBuilding(building, x, z, turn)` moves a building into the world and turns it around y.
  - `createBuildings()` places the brownstones (turn 0, facing +x), the far side (turn `Math.PI`, facing
    -x) and the new back row (turn `Math.PI / 2`, facing -z).
  - the roof position for the water towers is kept in the building's own space and turned into a world
    position with the building's matrix.
- `js/environment.js`: adds the cross street to the environment group.

**Why:** behind the train track the scene ended in empty sky. A second street with buildings along it
makes the court sit in a real grid of streets, and gives the space under and behind the El something to
look at. The street on the court's left now runs into the cross street, as in a real neighbourhood.

**How it works:**

- **Layout along z, from the court outwards:** the court's ground ends at 15, the near sidewalk runs to
  16.5, the street to 21.5, the far sidewalk to 23.5, and the back row of buildings starts there and is
  8 m deep. All of these are worked out in the code from `centreZ`, `width` and the sidewalk widths, so
  moving the street moves everything with it.
- **Its own ground:** the court's surround ends at z = 15, so the cross street adds a ground plane in the
  same grey from there to z = 33, under the street and the buildings.
- **The T-junction:** the left street ended at z = 15. A piece of asphalt the left street's width now
  continues it to the cross street's near kerb, so the two join. The near sidewalk is built in two pieces,
  on both sides of where the left street comes in, and the dashed line along the cross street skips the
  part where the two streets meet. The far sidewalk is one piece: nothing crosses it.
- **Layers:** ground at the surround's height, asphalt 1 cm above, dashes 2 cm above, the same as the other
  street, so nothing flickers.
- **Buildings facing any way.** The old `createBuilding()` could only face +x or -x, because it placed
  everything in world coordinates. Now every building is built facing +x around its own origin and then
  turned. A turn around y by an angle takes +x to `(cos θ, -sin θ)` on the x and z axes, so 0 faces +x,
  `Math.PI` faces -x and `Math.PI / 2` faces -z. The body goes backwards from the front (local -x), so it
  always ends up behind the front, away from the street. Checked with three.js: the brownstones and the far
  side end up exactly where they were before, and the back row's fronts face -z with their bodies behind.
- **Roofs:** the middle of a roof is stored as a `Vector3` in the building's own space.
  `applyMatrix4(building.matrix)` applies the building's position and turn to it, which gives where it is
  in the world, so a water tower lands on the right roof whichever way the building faces.
  `placeBuilding()` calls `updateMatrix()` so that matrix is up to date straight away.

## Back fence collider (physics.js)

**What:** a Rapier collider for the tall fence behind the hoop, added in `createPhysics()` with `Fence` imported from `constants/fence.js`.

**Why:** long misses and hard bounces off the backboard flew straight through the chain-link into the street, because the fence was only a picture. Now they bounce back towards the court, like on a real street court.

**How it works:** the fence side behind the hoop is one thin box collider, the same pattern as the backboard:

- `cuboid(halfX, halfY, halfZ)` takes half sizes, so the width is `(Fence.maxX - Fence.minX) / 2` (8.5 m half, 17 m wide), the height `Fence.backHeight / 2` and the thickness `0.1 / 2`.
- `setTranslation` puts its centre in the middle of the fence: x halfway between `minX` and `maxX` (0), y at `Fence.groundY + backHeight / 2` so the bottom stands on the surround, z at `Fence.maxZ` (9), the line where the chain-link is drawn.
- `setRestitution(0.3)`: chain-link gives, so the ball loses most of its speed, far less bouncy than the glass backboard (0.6). `setFriction(0.5)` lets it slide down the mesh a little.

The numbers come from the same `Fence` constants as the drawn fence, so the mesh and the collider always match. The collider lives in `physics.js`, not in the environment files: it is game physics, so it still exists (as an invisible wall) if the environment is ever left out.

## Deep shot spot (constants/court.js, script.js)

**What:** a sixth spot in `Court.spots`, `'deep'` at index 5, and a new constant `Court.rotationSpots = 5`. In `handleSpotChange()` the rotation now wraps with `% Court.rotationSpots` instead of `% Court.spots.length`.

**Why:** downtown countdown sends the player to a far shot worth extra points when on a hot streak (`Court.spots[5]` in `handleSpotChange()`), but that spot did not exist yet.

**How it works:** the spot is made with the same `makeSpot(name, x, z)` helper as the others, so it gets its `facing` angle towards the rim for free. It stands at x = 0 (straight in front of the hoop) and `rimZ - 9.5`, so 9.5 m from the rim against 7.25 m for the arc spots, still on the court (z ≈ -4.1, the court ends at -7). The normal rotation used `Court.spots.length` to wrap around; with six spots that would have walked onto the deep spot as a normal stop. `Court.rotationSpots` keeps the rotation on 0 to 4, and the deep spot is only reached through the hot streak code.

## Points as the score (script.js, index.html)

**What:** `stats.points` is now the game's score. A normal make adds 2 points, the deep shot in downtown countdown adds 3. `stats.madeShots` is still counted on every make (also the deep shot), but only to work out the shooting percentage. Both run starts (`startDowntownCountdown`, `startAroundTheWorld`) reset `points` to 0, the stats panel got a "Points" line (`#points`, filled in `updateStatsDisplay`), and the downtown countdown end screen shows the points instead of the made shots.

**Why:** with the deep shot there are now makes worth different amounts, so counting makes no longer tells the score.

**How it works:** in `checkMadeShot()` the counters every make shares (`madeShots`, `streak`) are raised first. Then the `if` picks the points: on a hot streak in downtown countdown the make was the deep shot (+3, the spot rotation does not move on), otherwise it is a normal make (+2, and `spotProgress` counts towards the next spot). Keeping `madeShots++` outside the `if` means a deep make also counts for the shooting percentage, which before it did not.

## Performance mode checkbox (index.html)

**What:** a checkbox labelled "performance mode" in the menu, under the three mode buttons (`#performanceMode` with the input `#performanceModeCheckbox`), with its own CSS. It only looks and clicks for now: nothing reads it yet.

**Why:** the environment (street, buildings, track, stands) costs frame rate next to MoveNet. The checkbox is the switch to skip it on slow machines.

**How it works:** the `<input>` sits inside the `<label>`, so clicking the text also ticks the box. `appearance: none` removes the browser's own checkbox, so the input can be drawn like the menu's buttons: a cream square with a dark border and the same stacked hard shadow (pink, then dark purple). The tick is the `::after` of the input: a narrow rectangle with only a right and a bottom border, turned 45 degrees, which makes a check mark. It is `scale(0)` (invisible) normally and grows to `scale(1)` on `:checked`, while the box turns lime. The label is skewed like the buttons, and the cream text gets a dark hard shadow so it reads on the blue menu.

## Deep shot only checkbox (index.html)

**What:** a second sticker checkbox, "deep shot only" (`#deepShotsOnly`, input `#deepShotOnlyCheckbox`), meant for free play only. It is in the HTML with the `hidden` attribute and placed top right in the game view, where the timer sits in the timed modes (free play hides the timer, so the spot is free). Showing it in free play and what it does is logic still to be written.

**Why:** in free play you can practise the deep shot on its own.

**How it works:** the checkbox CSS that was written for performance mode is now a class, `.stickerCheckbox`, so both checkboxes share one look (the cream box, the shadow, the lime tick) and only their positions differ: `#performanceMode` keeps a small top margin under the menu buttons, `#deepShotsOnly` is `position: absolute` in the top right. Because `.stickerCheckbox` sets `display: flex`, a CSS rule beats the browser's own `[hidden] { display: none }`, so `#deepShotsOnly[hidden] { display: none; }` is added to make `hidden = true` still hide it. It sits outside `#menu`, because the menu is hidden while playing.

## Jump delay fix (script.js, handlePose)

**What:** the delayed jump when the arms start rising works now. `jumpDelay` moved out of `handlePose` to a variable next to `poseUntil`, a new timer only starts when none is waiting and the player is not already jumping, and the waiting jump is cancelled when the arms go back to the default pose.

**Why:** the old code called `clearTimeout(jumpDelay)` on the line right after `setTimeout`, so the timer was cancelled 0 ms after it started and the jump never happened.

**How it works:** `setTimeout` returns an id that `clearTimeout` can cancel. Declared inside `handlePose` with `let`, that id was lost when the function ended, so it could only be cancelled immediately. At the top of the file it survives between pose frames. `jumpDelay === null` means "no jump waiting", so the `if` starts at most one timer; when the timer fires it sets `jumpDelay` back to `null` before calling `startJump()`. In the `def` branch (arms down) `clearTimeout(jumpDelay)` stops a jump that has not started yet, so lowering the arms within 200 ms cancels it. `clearTimeout(null)` does nothing, so that is safe when nothing is waiting.

## In-game menu button (index.html, script.js)

**What:** a "Menu" button in the game view (`#menuBtn`, top right corner; the timer and the deep shot checkbox moved down to `top: 9%` to sit under it) that goes back to the main menu at any moment, and a new function `goToMenu()` that the after game screen's Home button now uses too.

**Why:** before, the only way back to the menu was finishing a run. Free play has no end, so it had no way back at all.

**How it works:** `goToMenu()` does everything that leaving a run needs, in one place: `clearInterval(timeInterval)` stops a stopwatch or countdown that is still running (otherwise it would keep ticking, and a countdown would still end the run and open the after game screen while in the menu), the after game screen, the timer and the deep shot checkbox are hidden, `mode` and `runPhase` go back to `'menu'` and `'idle'` so no shots can be taken, `placeCamera(true)` sets the camera's goal to the menu pose (`Camera.menu`) so `smoothCamera` glides it back there, and `showMenu()` shows the menu and restarts its drawing loop. The Home button used to do part of this inline; now both buttons call the same function, so they cannot drift apart. The button sits in the HTML before `#menu`, so the full-screen menu covers it while it is open and it only shows during play.

## goToMenu stops every timer (script.js)

**What:** `goToMenu()` now cancels every timer that is still waiting: the run's stopwatch or 60 second countdown (`timeInterval`), the 3-2-1 countdown before a run (new variable `countdownTimeout`, filled in `showCountDown`), and a waiting jump (`jumpDelay`). It also hides the `#countdown` number.

**Why:** pressing Menu during the 3-2-1 left the countdown running. When it finished, `startAroundTheWorld` / `startDowntownCountdown` carried on after their `await showCountDown(3)` and started a run behind the open menu, timer and all.

**How it works:** `showCountDown` waits each second with `new Promise(resolve => setTimeout(resolve, 1000))`: the promise resolves when the timeout calls `resolve`. Its id is now stored in `countdownTimeout` (only one is waiting at a time, the countdown goes number by number). `clearTimeout(countdownTimeout)` cancels it, so `resolve` is never called and the promise stays pending: the code after `await` in the start function simply never runs, so the run is never started. A pending promise that nothing refers to any more is cleaned up by the browser, so nothing leaks. `clearTimeout` and `clearInterval` with an id that already fired or `undefined` do nothing, so `goToMenu` is safe to call at any moment, also from the after game screen.

## Username field in the menu (index.html)

**What:** a text field above the character in the main menu (`#usernameInput` inside the label `#menu__name`), with a small pink "PLAYER" tag on top. Nothing reads it yet: it is where the player will type the name for the online leaderboard.

**Why:** the leaderboard needs a name per upload. Asking once in the menu means the player does not have to type it after every round.

**How it works:**

- **Place:** the label is `position: absolute` in `#menu`, at `left: 65%`, the middle of the character's canvas (the canvas starts at 50% and is 30% wide), and `translateX(-50%)` centres it on that point. `top: 6%` puts it just above the canvas (which starts at 10%), and `z-index: 1` keeps it in front of the canvas where they overlap.
- **Look:** the field uses the menu's sticker style: the Bowlby One font in capitals, a cream background with faint halftone dots, a dark border, and a stacked hard shadow (teal, then dark purple), skewed like the buttons. The "PLAYER" tag is a small pink sticker that overlaps the field's top edge (negative bottom margin).
- **Feedback:** on `:focus` the field lifts off its shadow and the shadow turns pink, like a hovered button. `:invalid` (with `:not(:placeholder-shown)`, so an empty field is not marked) turns the shadow orange when the name breaks the pattern.
- **Rules in the HTML:** `maxlength="16"` stops typing after 16 characters (the `VARCHAR(16)` in the table), and `pattern="[A-Za-z0-9]{1,16}"` only accepts letters and numbers. These are only for the player's convenience: `scores.php` must check the same again, because the browser's checks can be bypassed.

## Score upload fixed, and scores.php (db.js, script.js, constants/api.js, server/)

**What:**

- `js/constants/api.js` (new): `Api.scoresUrl`, the full address of `scores.php` on Combell.
- `js/db.js`:
  - `uploadScore(formData)` now posts the `FormData` straight to that address, without headers.
  - `fetchScores(mode)` does a plain GET with the mode in the URL.
- `js/script.js`:
  - `setData()` finds the form by its id, sends the mode as its id (`downtownCountdown` / `aroundTheWorld`), and takes the around the world time from the new `stats.finalTime`.
  - The upload button shows "Sending…", "Uploaded!" or "Failed, retry". It cannot be clicked twice, and `resetUploadButton()` makes it usable again at the end of every round.
- `server/scores.php` (new): the PHP that receives scores and returns the top 10.
- `server/config.example.php` (new): the shape of the database login file.
- `.gitignore`: added `server/config.php`, so a real login copied into the project is never committed.

**Why:**

- The fetches used `/api/score`, a path on GitHub Pages, where no PHP runs (404).
- Around the world always uploaded 0, because `endTimer` reset `stopWatch` before the upload.
- The mode was read from a hidden input that was never filled, so every upload said "Around the World".
- Sending JSON with a `Content-Type` header made the browser send an extra OPTIONS request first.
- There was no feedback, and a click could upload the same round many times.

**How it works:**

- **Where the request goes:** the game (GitHub Pages) and the API (Combell) are on different domains, so the URL has to be complete. It is a constant, not a `.env` value: it is not secret, and the GitHub Actions build has no `.env`.
- **FormData:** a `FormData` body counts as a "simple" request for CORS, so the browser sends the POST directly with no preflight, and PHP gets the fields in `$_POST`.
- **The time:** `endTimer` copies the time into `stats.finalTime` before resetting `stopWatch`.
- **Upload button:** it is disabled while sending and after a success. On an error it is enabled again so the player can retry. `await` with `try/catch` catches both network errors and the `{ ok: false }` answers.
- **scores.php, CORS:** the `Access-Control-Allow-Origin` header is only sent for the game's own addresses (GitHub Pages and `localhost:5173`). Without it, the browser does not give the answer to the page.
- **scores.php, database login:** the login comes from `config.php` in the hosting's home folder, outside `www`, so no browser can open it.
- **scores.php, GET:** returns the top 10 of a mode, highest points or fastest time first. The column name comes from a fixed list (`MODES`), never from the request.
- **scores.php, POST:**
  - Checks the name (1 to 16 letters or numbers), the mode, and the score's range (points 0 to 200, a time 1 to 3600 seconds).
  - Saves with a prepared statement: the values are sent separately from the SQL text, which is what makes SQL injection impossible.
  - Turns the mode into the two 0/1 columns and puts the score in `points` or `time_seconds`.

## Leaderboard address from an environment variable (constants/api.js, .env, deploy.yml)

**What:** `Api.scoresUrl` is no longer written in the code. It reads `import.meta.env.VITE_SCORES_URL`. Locally that value is in `.env`, `.env.example` shows the name, and the GitHub Pages workflow passes it to the build from a repository variable.

**Why:** the address can change (another domain, a test server) without touching the code, and every place that needs it reads the same value.

**How it works:**

- **How Vite reads it:** Vite reads `.env` when it starts (`npm run dev`) or builds. Only variables whose name starts with `VITE_` reach the game's code, as `import.meta.env.VITE_...`. That prefix is Vite's safety rule, so a database password in the same file can never leak into the game by accident.
- **It is public:** in the build, Vite pastes the value straight into the JavaScript. So a `VITE_` value is visible to anyone, which is fine for an address but never for a secret.
- **On GitHub:** `.env` is in `.gitignore`, so GitHub's build machine does not have it. The Build step in `deploy.yml` gets an `env:` entry that sets `VITE_SCORES_URL` from `vars.VITE_SCORES_URL`, a repository variable set under Settings > Secrets and variables > Actions > Variables. Vite reads environment variables from the system the same way as from `.env`.
- **After a change:** Vite only reads `.env` at start, so the dev server must be restarted.

## Leaderboard on the after game screen (index.html, script.js)

**What:** a top 10 card in the bottom right of the after game screen (`#leaderboard`), showing the online scores of the mode that was just played. New in `script.js`: `loadLeaderboard(mode)` and the small helper `formatTime(seconds)`.

**Why:** uploading a score only means something when you can see where it lands.

**How it works:**

- **When it loads:** `endTimer` and `endCountdownTimer` call `loadLeaderboard(mode)` when the round ends, and the upload button calls it again after a successful upload so the new row appears. It is not loaded in `init` (it would be out of date after the first upload) and not at the start of a mode (nobody sees it while playing).
- **Not awaited:** the end-of-round functions call it without `await`, so the after game screen shows at once and the list fills in when Combell answers.
- **Per mode:** `fetchScores(mode)` asks `scores.php` for that mode only. For around the world the title is "Fastest times", the column says "time" and `formatTime` turns the seconds into `m:ss`. For downtown countdown it is "Top scores" and "points".
- **Building the rows:** the old rows are removed with `replaceChildren()`, then one `<li>` per score is made with `createElement`, holding two `<span>`s (name and result). The text goes in with `textContent`, never `innerHTML`, so a name is always shown as plain text and can never become HTML.
- **Own rows:** a row whose name equals the saved username (compared in lower case) gets the class `is-me` and turns pink.
- **Status line:** "Loading…" while waiting, "No scores yet, be the first!" for an empty list, "Leaderboard unavailable" when the request fails. The function catches its own errors, so a server that is down never breaks the game.
- **An `<ol>` that looks like a table:** the list has `list-style: none`, and each `<li>` is a CSS grid with three columns (`2em 1fr auto`: rank, name, result). The header row above it uses the same grid, so the columns line up. The rank is drawn by a CSS counter (`counter-increment` on each row, shown in `li::before`), which puts the number in its own column. Even rows are striped, the first place is yellow.
- **Place:** the card is inside `#afterGame` with `position: absolute`, `right` and `bottom`, so it shows and hides together with that screen.

## Leaderboard visible during the whole run (index.html, script.js)

**What:** the leaderboard card is now on screen from the moment a timed mode starts, not only on the after game screen. New function `showLeaderboard(mode)`. The card moved out of `#afterGame` in the HTML and starts `hidden`.

**Why:** the scores to beat should be visible while playing.

**How it works:**

- **Showing:** `handleAroundTheWorldClick` and `handleDowntownCountdownClick` call `showLeaderboard()` with their mode. It unhides the card and calls `loadLeaderboard`, so the list is that mode's top 10. The mode is passed as text, because the `mode` variable is only set a moment later in the start functions.
- **Refreshing:** unchanged. `loadLeaderboard(mode)` still runs when the round ends and after an upload, so the list is fresh at the moments it matters.
- **Hiding:** `goToMenu()` and `handleFreeplayClick()` set `hidden = true`. Free play has no scores, and in the menu the card would sit on top of the menu.
- **Place:** the card was a child of `#afterGame`, so it could only show with that screen. Now it stands on its own, with `position: fixed` (placed against the window) and `z-index: 7`, one above the after game screen's 6, so it stays in front of that screen's blurred layer. `right: 7.5%` keeps it left of the shot meter on the right edge.

## Disabled state for the buttons (index.html, script.js)

**What:** a `:disabled` style for the menu buttons, the after game buttons and the in-game Menu button: grey, faded, with a flat shadow, and no hover or press effect. In `script.js` the line `uploadBtn.classList.add('disabled')` was removed.

**Why:** the upload button is disabled while sending and after a successful upload, but it looked exactly like a button that still works.

**How it works:**

- **`:disabled`** is a CSS state the browser switches on by itself for a button with `disabled = true`, and off again with `disabled = false`. No class is needed. The removed `classList.add('disabled')` was never taken off again, so a class-based style would have stayed grey for every later round.
- **`filter: grayscale(1)`** removes the colour from the whole button. A filter is used instead of a grey `background-color`, because some buttons get their colour from an id rule (`#menu #aroundTheWorldBtn`), which would win over a `:disabled` rule. A filter applies on top of whatever colour the button has.
- **`opacity: .55`** fades it, and the stacked shadow is replaced by one thin dark layer, so the button looks pressed flat instead of liftable.
- **`pointer-events: none`** means the mouse does not reach the button at all, so the `:hover` and `:active` styles cannot start. Keyboard use is already blocked by `disabled` itself.

## Styling for the game mode descriptions and the shooting explanation (index.html)

**What:** CSS for two new UI elements. The game mode descriptions (`.description`) are the tooltips that follow the mouse over the Around the World and Downtown Countdown buttons. The shooting explanation (`#explanation`) is the screen with three steps and a continue button.

**Why:** both had almost no styling. The descriptions were a bare teal block sitting right under the cursor, and the explanation was plain HTML, so neither matched the sticker look of the rest of the UI.

**How it works:**

- **Description, look:** a small teal sticker with the buttons' halftone dots, a dark border, a pink-and-dark hard shadow, and a slight tilt. `max-width: 17em` wraps the longer text over a few lines instead of one long strip.
- **Description, position:** `script.js` puts its top left corner on the mouse (`left`/`top` from `clientX`/`clientY`). The `transform: translate(1.2em, 1em)` moves it a little down and to the right, so it never covers the pointer or the text the player is reading. `pointer-events: none` keeps it from catching the mouse.
- **Description, appearing:** hidden it has `opacity: 0` and is slightly smaller and lower (`scale(.9)`, a bit more `translate`). `.description.visible` sets the full size and opacity, and the `transition` on both makes it pop up. The rule became `.description.visible` instead of just `.visible`, so the class only does something on these tooltips. With reduced motion only the fade is kept.
- **Explanation screen:** a full-screen frosted layer (`position: fixed; inset: 0`, the same dark tint and blur as the after game screen) with `z-index: 8`, in front of everything else. `#explanation[hidden] { display: none; }` is needed because `display: flex` would otherwise win over the `hidden` attribute.
- **The three steps:** a wrapping flex row of cream sticker cards with pink shadows, each tilted a little differently (`nth-child`). In each card, the first `<p>` (the step's name) becomes a pink tag, and the last `<p>` (the sentence) uses a plain bold system font so it reads easily.
- **Pictures:** the image is a framed teal square (`aspect-ratio: 1`). `img[src=""]` is hidden, so the empty placeholders do not show as broken images until real pictures are added.
- **Continue button:** written for `#explanation > button` with the same yellow sticker look, hover lift and press as the menu buttons. The shared button rules only cover `#menu` and `#afterGame`, so this button would otherwise get none of it.

## Free play description (index.html, script.js)

**What:** a description tooltip for the FreePlay button (`#freePlayDescription`, "Shoot around at your own pace: no timer, no pressure!"), like the ones for the two timed modes.

**Why:** FreePlay was the only mode button without an explanation.

**How it works:** the same pattern as the other two descriptions. The `<div class="description">` sits in `#menu` and gets all its styling from the shared `.description` rules. In `setEvents`, `mouseover` adds the `visible` class (the sticker pops up), `mousemove` puts its corner on the mouse with `clientX`/`clientY`, and `mouseleave` takes the class off again.

## The cat is a sleeping cat (objects/cat.js, constants/cat.js)

**What:** `createCat()` builds a curled-up sleeping cat from primitives instead of a single 20 cm cube: a low body, a head resting on two front paws, two pointy ears, closed eyes, a pink nose and a tail wrapped round the front. All sizes moved into the `Cat` constants. The cat also gets a random fur colour from `catColors` now (before, `randomColorIndex` was worked out but `catColors[0]` was always used), and `cat.js` imports `three/webgpu` instead of `three`, like the other objects.

**Why:** the cube did not read as a cat at all. And every three.js object in the game has to come from `three/webgpu`: mixing it with plain `three` gives two copies of the library, whose materials the WebGPU renderer does not handle the same way.

**How it works:**

- **Same building blocks as the boombox:** an `addBox` helper (a box with its outline shell) and flat `MeshBasicMaterial`s, so the cat matches the player's and the boombox's flat look. The origin is on the floor under the middle of the body, and every part is placed by its middle, so things lying on the floor are lifted by half their height.
- **The pose:** a cat sleeping curled up is a low loaf, so the body is wide and only 15 cm high. The head sits at the `-x` end, partly on the body, lying on two flat paws that stick out 2 cm in front of the face.
- **Head group:** the head, ears, eyes and nose are children of one `Object3D` (a pivot, like the shoulder joints). `rotation.x` on that group rolls the whole head onto its side, which is how cats sleep, and every part of the face moves along.
- **Ears:** `ConeGeometry` with only 4 sides is a small pyramid, which fits the low-poly look. `rotation.y = Math.PI / 4` turns a flat side, not a corner, to the front.
- **Closed eyes:** two very thin dark boxes on the face, without outlines (they are lines already). They sit 2 mm in front of the face so they do not flicker inside it (z-fighting).
- **Tail:** one straight piece along the front side of the body on the floor, and a short tip turned with `rotation.y` so it curls in towards the paws.
- **Clicking:** `makeClickable(cat, toggleCat)` in `script.js` raycasts against the whole group, so clicking any part of the cat still plays its sound.

## The cat stands up when clicked (objects/cat.js, constants/cat.js, script.js)

**What:** the cat has two poses: asleep (curled up, the pose from before) and awake (standing on four legs, head up, eyes open, tail straight up). Clicking it plays its sound and makes it stand. Clicking again, or the sound ending by itself, curls it up again. `createCat()` now returns `{ cat, setAwake }` instead of only the group. In `script.js` the unused `catMesh` became `catParts`.

**Why:** the click only played a sound, and nothing on screen reacted to it.

**How it works:**

- **Two poses, built once:** `createSleeping()` and `createStanding()` each build a complete cat in their own `Object3D`. Both go into the `cat` group, and only one is `visible` at a time. `setAwake(awake)` flips the two `visible` flags. Building both up front means switching costs nothing, and the poses never have to be rebuilt.
- **Shared head:** `createHead(..., awake)` builds the head with its ears, eyes and nose for both poses. Awake, the eyes are small dark squares (`eye.openHeight`). Asleep, they are the thin closed lines.
- **The standing pose:** a slimmer body (`Cat.standing`) lifted by the leg height, four legs under its corners placed with one loop over the four (x, z) corners, the head up in front, and the tail as an upright box at the back, leaned back with `rotation.z`.
- **Same colour in both poses:** the materials (fur, pink, dark) are made once in `createCat()` and passed to both builders, so the random fur colour is the same awake and asleep.
- **The return value:** like the player's `{ player, joints }`, `createCat()` returns the group to add to the scene plus a function to control it: `{ cat, setAwake }`. The game changes the pose without searching the scene graph.
- **Kept in step with the sound:** `toggleCat` checks `cat.paused` (the `Audio` object) to choose. If paused, it plays the sound and calls `setAwake(true)`. Otherwise it pauses and calls `setAwake(false)`. An `ended` listener on the audio puts the cat back to sleep when the sound finishes by itself, so the pose always matches whether the sound is playing.
- **Clicking:** `makeClickable(cat, toggleCat)` gets `catParts.cat`, the whole group. The raycaster only hits visible meshes, so it works in both poses.

## The cat faces the player (objects/cat.js, script.js)

**What:** the cat turns around y so its face looks at the player, in both poses, and keeps following the player from spot to spot. `createCat()` returns a third function, `faceTowards(x, z)`. The render loop calls it every frame with the player's position.

**Why:** it lay at a fixed angle, side-on to the court. A first version made it look at the basket, but it should watch the player.

**How it works:**

- **The angle:** the head is built on the cat's own -x side. Turning an object by an angle around y moves its -x direction to `(-cos(angle), sin(angle))` on the floor, in three.js's rotation convention. The direction from the cat to the point is `(x - cat.x, z - cat.z)`. Setting `-cos(angle)` and `sin(angle)` proportional to those two gives `angle = atan2(toZ, -toX)`. It is the same `atan2` idea as the spots' `facing` angle in `constants/court.js`, only for a model whose front is -x instead of +z.
- **Every frame:** the player moves to a new spot after makes, jumps, and goes to the deep spot. Calling `faceTowards(playerMesh.position.x, playerMesh.position.z)` in `render` covers every one of those without hooking into each place that moves the player. It is only an `atan2` per frame, so it costs nothing.
- **Both poses:** the rotation is on the outer `cat` group, so the sleeping and the standing pose both turn with it.

## Shooting explanation text matches the detection (index.html)

**What:** the three steps in `#explanation` are in the order a shot is done (get ready, load, shoot) and numbered, the texts are rewritten, and each picture got an `alt` text.

**Why:** the old texts did not match what `motionDetection.js` checks. "Loading your arms" did not say what to do, "fast" was vague, and the most important rule, releasing while the meter is in the green zone, was missing. The reset step came first, while a shot starts with the arms down.

**How it works:** each text now describes the pose the code detects:

- **Get ready:** the `default` pose. Both arms straight (elbow at least 160°) with the wrist clearly below the elbow. It resets the meter.
- **Load:** the `loaded` pose. Both elbows bent (under 110°) with the hands below the shoulders. It starts the meter.
- **Shoot:** the `released` pose. One arm with the elbow opened and the wrist above the head (`some` arm, so one is enough). The text adds the green zone, because the timing decides the shot.

The `alt` texts describe each pose for screen readers and for when a picture does not load. The `src` values stay empty until the pictures exist in `public/images/`: the CSS hides an image with an empty `src`, while a wrong path would show a broken-image icon.

## Help button opens the shooting explanation (index.html, script.js)

**What:** a "Help" button in the game view (`#helpBtn`, top right, just left of the Menu button). Clicking it opens the `#explanation` popup. The popup's continue button (now `#explanationContinue`) or the Escape key closes it.

**Why:** the explanation of the shooting poses existed but could not be opened.

**How it works:**

- **Look:** the help button shares every rule of the Menu button: each `#menuBtn` selector (base, hover, active, focus, disabled) got `#helpBtn` added. A separate `#helpBtn` rule after them only changes what differs: teal instead of yellow, and its position. Both buttons have the same font size, so `right: calc(2.2% + 6.6em)` is the Menu button's spot plus its width and a small gap.
- **Opening:** the click sets `explanation.hidden = false`. The CSS rule `#explanation[hidden] { display: none; }` does the hiding, so this one flag is enough. Focus moves to the continue button, so Enter or Space closes the popup right away and keyboard users land inside it.
- **Closing:** continue sets `hidden = true` again, and a `keydown` listener does the same for Escape.
- **Covered in the menu:** like the Menu button, it sits in the HTML before `#menu`, so the full-screen menu covers it while it is open.

## Explanation pictures linked (index.html)

**What:** the three `<img>` tags in `#explanation` point to the SVG pictures in `public/images/` (`explanation-1-ready.svg`, `explanation-2-load.svg`, `explanation-3-shoot.svg`).

**Why:** the pictures had been added to the project, but the `src` values were still empty, and the CSS hides an image with an empty `src`.

**How it works:** Vite copies everything in `public/` unchanged into the build and serves it from the site's root. So `public/images/x.svg` is reached as `images/x.svg`, without `public/`. The path is relative (no leading `/`), which fits `base: './'` in `vite.config.js`: on GitHub Pages the game lives in a subfolder (`/heatCheck/`), and a path starting with `/` would look in the domain's root instead.

## Equalizer shader on the boombox screen (shaders/visualiser.wgsl, shaders/visualisers.js, objects/boombox.js, script.js)

**What:** the boombox screen shows animated equalizer bars: a second Shadertoy shader (Audio Visualizer Bars, https://www.shadertoy.com/view/WflXDr, original code in `shaders/visualisers.glsl`) ported to WGSL. The bars move while the music plays, and the screen goes black when the boombox is switched off.

**Why:** a second shader is on the plan, and the screen was a plain dark plane waiting for it.

**How it works:** the same setup as the fire shader.

- **The WGSL file** (`visualiser.wgsl`) holds three plain functions in order: `randFloat`, `randColor` and `visualiser`. `visualisers.js` reads the file as text with `?raw`, cuts it at every `fn ` at the start of a line, and turns each piece into a node with `wgslFn`. The second argument lists the functions it calls: `randColor` needs `randFloat`, and `visualiser` needs both.
- **What the shader does:**
  - The screen's uv (0 to 1) is moved so the middle is 0 and multiplied by 30, which makes a grid of 30 by 30 cells.
  - `floor` gives the cell (`id.x` is the column, `id.y` the row), and `fract - 0.5` gives the position inside the cell.
  - Each column gets its own speed from `randFloat(id.x)`, and its bar height is `sin(time * speed * 2) * 8`. A cell lower than that height gets the column's random colour.
  - A thin black line on two edges of every cell makes the bars look like LED blocks.
- **Changes from the GLSL:**
  - `fragCoord / iResolution` became the plane's own `uv`.
  - `col` starts at `vec3f(0.0)`, because WGSL has no unset variables.
  - The chained `r = g = b = 0.8` became three lines, because WGSL has no chained assignment.
  - `vec3`/`vec4` became `vec3f`/`vec4f`, and every `if` got braces.
  - A new `on` input multiplies the colour, like the fire's `heat`.
- **The material** (in `createBoombox`) is a `MeshBasicNodeMaterial` whose `colorNode` is `visualiserFn({ uv: uv(), time, on })`. `time` and `on` are `uniform`s, and `createBoombox` returns them as `visualiser: { time, on }`, the way the basketball returns `fire: { time, heat }`.
- **Every frame**, `updateBoombox(time)` sets `visualiser.time.value = time` and `visualiser.on.value` to 1 while the track plays and 0 when it does not, using the same `playing` check that drives the boombox's bounce.

## Short part labels in the object files, and no console logging (js/objects, script.js, motionDetection.js)

**What:**

- **Object files:** in every file in `js/objects`, each comment block above a piece of code is now a short label naming the object or part it creates (`// body`, `// tail`, `// rim outline`, `// coping`), the way the boombox already did. Comments at the end of a line, which explain a single number or step, are kept.
- **Logging:** every `console.log` and `console.error` call is removed from `script.js` and `motionDetection.js`. The camera's `catch` block keeps a one-line comment saying why it may be empty.
- **Fix:** a stray character after the import in `shaders/visualisers.js` is removed. It would have stopped the whole game with a ReferenceError when the page loaded.

**Why:** the long comments made the object files hard to scan, and the console was full of debug output that a player or grader does not need.

**How it works:** the labels work like headings. Reading only the comments of `createBoombox` or `createSleeping` now gives the list of parts in the order they are built. The detailed explanations of how each part works stay in this dev diary.

The error messages are gone too, but every place that catches an error still handles it: the upload button shows "Failed, retry", the leaderboard shows "Leaderboard unavailable", and without a camera the game is played with the keyboard. Only the console messages disappear.

## The arms move when shooting with the spacebar (script.js)

**What:** the spacebar handlers in `setEvents` set the player's arm pose too. Holding space puts the arms in the `loaded` pose (ball at the chest), letting go raises them into the `release` pose, and after `poseHold.release` milliseconds they go back to `default`.

**Why:** the arms only moved with the webcam. With the keyboard the meter filled and the ball flew, but the character stood still.

**How it works:**

- **The shared target:** `updateArms()` eases the shoulder and elbow pivots towards `targetPose` every frame, whatever set it. Until now only `handlePose` (the webcam) set it. The keyboard handlers now set it to the same three poses from `Player.poses`, so both inputs move the arms the same way.
- **Only real shots:** after `startMeter()`, the loaded pose is only set when `shotPhase` became `'aiming'`. `startMeter` refuses in the menu, during the 3-2-1, and while the ball is still flying, and then the arms do not move either.
- **The order on release:** `wasAiming` is read before `releaseMeter()`, because that call changes the phase to `'flying'`. Checking afterwards would always say no shot was released.
- **Back down:** the webcam's own return to `default` lives inside `handlePose`, which never runs without a camera. A `setTimeout` of `poseHold.release` (the same hold time the webcam uses after a release) puts the arms back down after a keyboard shot.

## The webcam no longer overrides a spacebar shot (script.js)

**What:** a new flag, `keyboardShot`. It is `true` from the moment a spacebar shot starts until the arms are back down after the release, and while it is `true` `handlePose` returns straight away.

**Why:** with the spacebar the arms stayed down and flickered. The webcam runs all the time, and `handlePose` gets every camera frame. While the player held space, the camera saw their real arms hanging down: the `default` pose. So every frame it set `targetPose` back to `default` (the arms never rose, apart from a jolt on the first frame, which was the flicker) and called `resetMeter()`, which could even cancel the keyboard shot.

**How it works:**

- **Space down:** if `startMeter()` really started a shot (`shotPhase === 'aiming'`), the flag goes on and the arms get the loaded pose.
- **Space up:** the arms get the release pose, and the `setTimeout` that brings them back down also turns the flag off, so from then on the webcam moves the arms again.
- **Cancelled shot:** if the shot was cancelled while space was held (back to the menu, for example), the key-up finds nothing to release and turns the flag off too. Otherwise it would stay on and the webcam would never move the arms again.
- **In `handlePose`:** the check is its first line, before any pose is read, so a keyboard shot is never disturbed. The two inputs take turns: the keyboard during its own shot, the webcam the rest of the time.

## Spacebar shots jump too (script.js)

**What:** letting go of space calls `startJump()` together with the release pose, so a keyboard shot is a jump shot like a webcam shot.

**Why:** with the webcam the player jumps as the arms go up, and with the spacebar the player stayed on the ground.

**How it works:** `startJump()` is the same function the webcam uses. It only starts a jump when the player is not already in the air (`if (!jumping)`), gives an upward speed, and `updateJump(delta)` in the render loop moves the player up and back down with gravity, frame-rate independent. It is called after `releaseMeter()`, so the shot is launched from the hand's position at the moment of release. `shoot()` works out the launch speed from wherever the ball is, so the jump does not change the aim.

## script.js reorganised into themed groups (script.js)

**What:** `script.js` is reordered into groups, each under one heading comment in capitals that says what the group is about:

- **GAME STATE**
- **SCENE**
- **PHYSICS**
- **SOUND**
- **PLAYER MOVEMENT**
- **SHOT METER**
- **SHOOTING AND THE BALL**
- **SPOTS AND CAMERA**
- **INTERACTIVE OBJECTS**
- **GAME MODES**
- **TIMERS**
- **STATS DISPLAY**
- **LEADERBOARD**
- **EVENTS**
- **SETUP**
- **RENDER LOOP**
- **START**

Each group keeps its own variables at the top, followed by the functions that use them.

Smaller changes along the way:

- **Comments:** the ones that only repeated the code (`// set the volume to 70% of the original`, `// enable shadows for this light`) are removed or shortened. The ones that explain a reason (the fixed physics step, why `wasAiming` is read first) stay.
- **Repeated code:** the three menu descriptions used the same three listeners each, so that code is now one helper, `addDescription(button, description)`. `handleDeepshotsOnly` builds the spot once instead of in both branches of its `if`.
- **Code that did nothing:**
  - the unused imports `math` and `draw` from TensorFlow
  - the unused `boomboxScreen`
  - `shrinkDuration` in `shotReset`, and `p` and `onFloor` in `onMake`, which were never read
  - the two lines in `init` that set the green zone again right after `drawGreen` had already done it

**Why:** related code was spread over the whole file (the camera functions sat below `init`, the leaderboard below the helpers), which made the file hard to find your way around.

**How it works:** the behaviour is the same, because only the order of declarations changed. That is safe because every `const` function is only *called* once the whole file has run. The code that runs straight away is the `START` group at the bottom, so by then every function and variable above it exists. The few top-level statements higher up (creating the audio objects, the debug GUI, `cameraGoal` and the cat's `ended` listener) do not call any function defined below them.

## The CSS in its own file (css/style.css, index.html)

**What:** all the CSS that was in the one `<style>` block in the `<head>` of `index.html` (about 1,370 lines) moved, unchanged, to `css/style.css`. In its place `index.html` has one `<link rel="stylesheet" href="./css/style.css">`, after the Google Fonts link. Only the 8 spaces of HTML indentation in front of every line were removed.

**Why:** `index.html` was mostly CSS (1,530 lines, of which only about 160 were HTML), so the page structure was hard to find. A separate stylesheet keeps the markup and the styling apart.

**How it works:**

- **During development:** Vite follows the `<link>` and serves the file.
- **In the build:** it bundles the file into `assets/index-[hash].css`. The hash changes whenever the CSS changes, so browsers never keep an old version cached.
- **The path:** it is relative (`./css/...`), which fits `base: './'` for GitHub Pages.
- **Order:** the link sits in the same place as the old `<style>` block, after the font link, so every rule wins and loses exactly as before.
- **Images in the CSS:** the only `url(...)` values are inline `data:` SVGs (the menu's basketball pattern), so no paths had to change.
