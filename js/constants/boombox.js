// all sizes are in metres, like the court: 1 unit in the scene = 1 metre
// the boombox faces +z, its screen is on the front. it stands on the floor, y = 0 is the bottom
export const Boombox = {
    // where it stands: on the court next to the key, near the basket, turned a little towards the shooting spots
    x: 3.4,
    z: 6.4,
    facing: Math.PI + 0.35, // 0 = facing +z (the hoop side). PI turns it towards the shooters

    // the body
    width: 0.8,
    height: 0.42,
    depth: 0.24,

    // the two speakers on the front: a dark ring with a cream cone in the middle
    speakerX: 0.28, // from the middle of the body, to the left and to the right
    speakerRadius: 0.115,
    speakerDepth: 0.04,
    coneRadius: 0.055,

    // the little screen between the speakers, this is where the shader goes later
    screenWidth: 0.26,
    screenHeight: 0.14,
    screenY: 0.27, // height of the middle of the screen above the floor
    frameBorder: 0.02, // the dark frame is this much bigger than the screen on every side

    // the two knobs under the screen
    knobRadius: 0.025,
    knobY: 0.1,
    knobX: 0.06,

    // the carrying handle on top
    handleLength: 0.52,
    handleRise: 0.08, // how far the bar floats above the body

    // the antenna on the back
    antennaLength: 0.5,
    antennaRadius: 0.012,
    antennaTilt: 0.35, // radians, leaning away from the body

    // the bump while the music plays: it switches between a small and a large size, it does not listen to the music
    bumpInterval: 0.35, // seconds it stays in one size before it switches to the other
    bumpUp: 0.08, // how much taller it is in the large size (0.08 = 8 percent)
    bumpSide: 0.03, // and how much wider and deeper
};
