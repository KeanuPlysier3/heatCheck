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
