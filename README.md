# Heat Check

A low-poly street basketball shootout in the browser, built with three.js and its `WebGPURenderer`. You shoot
with your own arms in front of the webcam: hold the ball at your chest to fill the shot meter, push one arm up
to release. Hit the green zone for a perfect shot, chain makes to set the ball on fire, and post your score to
the online leaderboard.

**Live:** https://keanuplysier3.github.io/heatCheck/
(open it in a WebGPU browser, such as a recent Chrome or Edge, and allow the camera; without a camera the
keyboard works too)

> **Good lighting is needed for the webcam controls.** The pose model has to see your shoulders, elbows and
> wrists clearly. In a dark room, with a bright window behind you, or with your arms out of frame, it misses
> poses or detects them late. Light your face and upper body from the front and stand far enough back that
> your raised hands stay in the picture.

## The concept

You stand on an outdoor street court in a Brooklyn-style block, with brownstones, an elevated train, a mural
wall and stands, all in a loud late-90s cartoon palette with dark outlines. Everything is built from three.js
primitives.

**A shot works like this:**

1. **Get ready:** let both arms hang straight down. This resets the shot meter.
2. **Load:** bend your elbows and hold both hands at your chest, as if holding the ball. The meter starts to fill.
3. **Shoot:** push one arm straight up above your head. The player jumps and the ball leaves the hand.

The moment of release decides the shot. Release in the green zone and the ball follows the perfect arc to the
rim. Release too early or too late and the launch is too weak or too strong, in proportion to how far off you
were. Rapier physics then decides what happens: a swish, a rattle in, a bounce out or an airball. Sensors in
the rim count a make only when the ball goes through the top and then the bottom of the hoop.

TensorFlow.js runs the MoveNet pose model on the WebGPU backend, measures the elbow angles and the wrist
heights, and turns them into those three poses. The character's arms copy the pose on screen.

The model only works as well as the picture it gets, so **light matters**: an evenly lit room, light from the
front rather than from behind, and your whole upper body, raised hands included, in view of the camera.

### Game modes

| Mode | Goal |
| --- | --- |
| **Free play** | Shoot around without a timer. With *deep shot only*, every shot is from far behind the line. |
| **Around the World** | Make 3 shots on each of the 5 spots around the arc (corner, wing, top, wing, corner) as fast as possible. |
| **Downtown Countdown** | Score as many points as you can in 60 seconds. A make is worth 2 points. After 5 makes in a row you move to the deep spot, where a make is worth 4 but the green zone is half as wide. A miss sends you back. |

**Shared rules:**

- **On fire:** 3 makes in a row set the ball on fire with a shader flame. A miss puts it out.
- **Leaderboard (live site only):** after a timed round you can upload your result under the name you typed in
  the menu. The top 10 of the mode is shown during the run and on the end screen. The backend behind it is not
  part of this repository, see [The leaderboard backend](#the-leaderboard-backend-not-included).

### Controls

| Input | Action |
| --- | --- |
| Webcam | Shoot with your arms (see above). |
| Space | Hold to fill the meter, release to shoot. Always works, also without a camera. |
| Mouse | Click the boombox to play or stop the music, and click the cat to wake it up. |
| Menu | Change the player's colour with the arrows, type your name, pick a mode. Use *performance mode* on slower computers (it leaves out the scenery). |
| In game | **Menu** goes back to the menu and **Help** shows the shooting explanation. *Free cam* lets you look around with the mouse. |

## UI and user experience

The interface is built to feel like part of the street court: every button, card and label is a slanted
"sticker" in the game's palette, with a dark outline and a stacked hard shadow, in the Bowlby One font.

**The menu**

- **A live 3D preview:** the player is rendered next to the buttons. The arrows next to it change its colour,
  and the chosen colour is used in the game.
- **Moving details:** the logo's "HEAT" flickers like a flame, and a pattern of basketballs drifts slowly in
  the background.
- **Mode tooltips:** hovering a mode button shows a small sticker that follows the mouse and explains the mode
  in one sentence.
- **Remembered settings:** the name field is saved in the browser, so it is filled in again next time. The
  *performance mode* checkbox is remembered too, and it leaves the scenery out for slower computers.

**Shooting feedback**

- **The meter:** it rises next to the player while you aim. The green zone is drawn in it, and it shrinks for
  the deep shot.
- **Pop-up text:** "SHOT!" pops up when the webcam sees a release, "PERFECT!" when you hit the green zone, with
  a random tilt each time.
- **Sounds and fire:** a swish plays on every make, and a voice line plays on a perfect release. The ball
  catches fire after 3 makes in a row.
- **The camera:** it glides behind the player to every new spot, instead of jumping.
- **Spacebar shots look the same:** the character's arms move into the same poses and the player jumps, just
  as with the webcam.

**Around the run**

- **The 3-2-1:** a countdown pops in before every timed run.
- **During the run:** a stats panel (points, shots, makes, percentage) and a timer stay on screen. The
  leaderboard of the mode stays in the corner, so you can see the score to beat.
- **After the run:** a frosted end screen shows your time or score, with Home, Retry and Upload score.
- **Uploading:** the upload button shows *Sending…*, *Uploaded!* or *Failed, retry*. It greys out so the same
  round cannot be sent twice, and the leaderboard refreshes to show your new score.
  **Help** button opens a popup with three illustrated steps that explain the shooting poses. Continue closes it.


- **Keyboard:** The game is fully playable with the keyboard and mouse alone.

## Small interactions and easter eggs

The court is not only for shooting. Click around:

**The boombox** stands at the side of the court. Its music is a lo-fi beat that starts when the game loads.

- **Click it** to stop the music or start it again.
- **It bounces:** while the music plays, the boombox grows and shrinks to the beat.
- **Its screen:** a little LED equalizer runs on it, made with the second Shadertoy shader, with bars that
  bounce in random colours. When the music stops, the screen goes black.

**The cat** is curled up asleep next to the boombox, with its head on its paws, its eyes closed and its tail
wrapped around.

- **A different cat every time:** its fur colour is picked at random each time the page loads (ginger, grey,
  cream, charcoal, white and more).
- **It watches you:** it always turns to face the player, and follows you from spot to spot around the arc.
- **Click it:** it wakes up, stands on four legs with its eyes open and its tail up, and meows.
- **Back to sleep:** it curls up again when the sound ends, or when you click it a second time.

The mouse pointer turns into a hand over both objects, so they are easy to find.

## Shaders

Both shaders were written in GLSL on Shadertoy, ported by hand to WGSL, and plugged into node materials with
`wgslFn`. A `uniform` drives each one from JavaScript every frame.

- **Fire on the ball:** _title, author and URL still to be filled in_. Three nested open cylinders around the
  ball with additive blending. A `heat` uniform switches the flame on during a streak.
  Code: `js/shaders/fire.glsl` (original) and `js/shaders/fire.wgsl` (port).
- **Equalizer on the boombox screen:** *Audio Visualizer Bars*, https://www.shadertoy.com/view/WflXDr. LED bars
  that bounce while the music plays. An `on` uniform turns the screen off when the music stops.
  Code: `js/shaders/visualisers.glsl` (original) and `js/shaders/visualiser.wgsl` (port).

Shadertoy shaders are licensed CC BY-NC-SA 3.0 unless their author says otherwise. They are used here, with
credit, in a non-commercial school project.

## Libraries and tools

| Library | Version | Used for |
| --- | --- | --- |
| [three.js](https://threejs.org/) | 0.186 | All the 3D: the `WebGPURenderer`, the TSL node materials and `wgslFn` for the custom WGSL shaders, primitives, lights and shadows. Its add-ons `OrbitControls` (free cam) and `lil-gui` (debug panel) come with it. |
| [Rapier](https://rapier.rs/) (`@dimforge/rapier3d-compat`) | 0.21 | Physics: the ball, the rim, the backboard, the pole, the back fence and the floor, plus sensor zones in the rim that detect made shots. |
| [TensorFlow.js](https://www.tensorflow.org/js) (`@tensorflow/tfjs-core`, `-converter`, `-backend-webgpu`) | 4.22 | Running the pose model in the browser, on the WebGPU backend, so it shares the GPU with the game. |
| [Pose Detection](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection) (`@tensorflow-models/pose-detection`) | 2.1 | MoveNet Lightning: 17 body keypoints per webcam frame, from which the elbow angles and wrist heights are measured. |
| [Vite](https://vite.dev/) | 8.3 | The dev server and the build. It also loads the `.wgsl` shader files as text (`?raw`) and the leaderboard address from `.env`. |
| [Google Fonts](https://fonts.google.com/) | | The *Bowlby One* and *Lilita One* fonts of the interface. |

**Not libraries:**

- **Leaderboard server:** a single PHP file with a MySQL database on Combell hosting, not included in this
  repository (see below). The game talks to it with the browser's own `fetch`.
- **Built-in browser features:** the webcam, the sounds and the saved settings use the browser's own
  `getUserMedia`, `Audio` and `localStorage`.
- **Hosting:** GitHub Pages, deployed by a GitHub Actions workflow on every merge to `main`.

## The leaderboard backend (not included)

The online leaderboard only works on the live site. **The backend is not in this repository, on purpose:** the
PHP file and the database login stay on the server.

The reason is that it is not a conventional setup. I needed a database that is **always on**: the free hosted
databases I tried shut down after a week without use. I already had Combell hosting, which includes a MySQL
database that never sleeps, so I used that. The catch is that Combell does not accept database connections
from outside its own servers. So the game never talks to the database directly. It calls **one PHP file** on
Combell, and that file, running inside Combell, has access to the database:

```
  the player's browser                        Combell hosting
  (game on GitHub Pages)                      (my web space)

  ┌──────────────────────┐   HTTPS fetch     ┌───────────────────────┐   inside Combell   ┌──────────────┐
  │ js/db.js             │  POST: name,      │ www/api/scores.php    │   (allowed)        │ MySQL        │
  │  uploadScore()       │ ────────────────► │  - checks the input   │ ─────────────────► │ table scores │
  │  fetchScores(mode)   │  GET: ?mode=...   │  - CORS: only the     │                    │              │
  │                      │ ◄──────────────── │    game's address     │ ◄───────────────── │              │
  └──────────────────────┘   JSON: top 10    │  - prepared statement │                    └──────────────┘
                                             └───────────────────────┘
            ✗  a direct connection from the browser to MySQL (port 3306) is blocked by Combell
```

- **Upload:** the game sends the name, the mode and the score as form data. The PHP file checks them (a
  name of letters and numbers, a known mode, a realistic score) and inserts one row with a prepared statement.
- **Top 10:** the game asks for one mode, and the PHP file answers with the best 10 rows as JSON.
- **The login:** the database username and password live in a config file on Combell, outside the public
  folder, and never in the game's code.
- **The address:** the PHP file's address is the only link between the two. The build gets it from
  `VITE_SCORES_URL` (a GitHub Actions variable).

If you want an online leaderboard for your own copy, a proper backend is the better choice: a small API on a
server you control, or a hosted database service with access rules. This setup simply did the job I needed: a
free database that stays awake.

**Everything in this repository is meant for local use.** Under `npm run dev` the leaderboard and the upload
button are switched off, and the rest of the game works fully without any server.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173/. The game runs fully locally. The online leaderboard is switched off under
`npm run dev`, because its backend is not part of this repository.

## How AI was used

I used an AI assistant (Claude, by Anthropic, in Claude Code) throughout the project. My rules for it were:

- it explains or proposes first, and only writes code when I explicitly allow it;
- it applies the solutions from the course material before inventing its own;
- every change goes into the dev diary (`devDiary.md`) with what changed, why, and how it works.

The game's concept, the design decisions and the playtesting were mine. I wrote a large part of the code
myself, and asked for explanations whenever the AI's code used something I did not know yet. The table below
shows where the AI helped.

| Area | How AI helped |
| --- | --- |
| **Styling** | The CSS for the menu, the buttons and their disabled state, the checkboxes, the name field, the leaderboard card, the tooltips and the help popup, all in the same "sticker" style, and later moved into its own file `css/style.css`. It also drew the three SVG pose pictures for the help screen (a second Claude model, from instructions written by the first). |
| **Bug fixes** | Finding and explaining bugs, such as `const` declared inside an `if` block, a reference to an id that did not exist, a checkbox that kept focus so the spacebar unticked it, the webcam overriding keyboard shots, the timer resetting before the score was saved, air drag making long shots fall short, the order in which the hot streak and the spot change ran, and a database connection failing on the server. Most of the time I fixed them myself from the explanation. |
| **Code cleanup** | Regrouping `script.js` into themed sections, removing dead code and unused imports, cutting comments down to short part labels, removing the console logging, and putting repeated code in small helpers. |
| **Note taking** | Keeping `devDiary.md` up to date after every change, so every feature is documented with its reasoning. |
| **Mathematics** | The launch velocity for a perfect shot from any spot to the rim (projectile motion with a chosen entry angle, `½·g·t²`), the elbow angle from three keypoints (`acos`), the angles that turn an object towards a point (`atan2`), the spots on the three-point arc (`cos` and `sin` on the radius), the shot meter's error in proportion to the timing, and smoothing that does not depend on the frame rate (`1 − e^(−k·Δt)`). |
| **Code splitting** | Splitting the game into modules: one file per object (`js/objects/`), sizes and colours in `js/constants/`, physics, motion detection, the leaderboard API (`db.js`) and the shaders each in their own file. |
| **GLSL → WGSL** | Porting both Shadertoy shaders, for example `vec3` to `vec3f`, unset variables, chained assignments and braces on every `if`, plus reading the `.wgsl` file in with `?raw` and splitting it into `wgslFn` functions with their dependencies. |
| **Leaderboard backend** | Planning how to reach a Combell database that blocks outside connections, the SQL table with its checks, and the PHP file with input checks, CORS and prepared statements (kept on the server, not in this repository). |
| **This README** | Written with AI from the dev diary and the code, then checked by me. |
