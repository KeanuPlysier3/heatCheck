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
