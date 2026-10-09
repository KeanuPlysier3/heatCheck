// where the camera stands for each shooting spot, in the same order as Court.spots:
// left corner, left wing, top, right wing, right corner
// the offsets are in the player's own space, so they turn with the player: all sizes are in metres
//   x  negative = on the player's right (the player ends up on the left of the picture), positive = on their left
//   y  height above the floor
//   z  negative = behind the player (the player faces +z)
export const Camera = {
    offsets: [
        { x: -1, y: 1.3, z: -0.8 },   // left corner
        { x: -1, y: 1.3, z: -0.8 },   // left wing
        { x: -1, y: 1.5, z: -1.6 },   // top: backed up a little, the player is straight in front of the hoop
        { x: 1, y: 1.3, z: -0.8 },    // right wing: the left corner, mirrored
        { x: 1, y: 1.3, z: -0.8 },    // right corner: the left corner, mirrored
    ],
    // the menu camera is in WORLD space, so it does not turn with the player: it stands on the -z side, in the middle (x = 0),
    // high up and far back, and looks at the middle of the court (the world origin)
    menu: {
        position: { x: 0, y: 9, z: -9 },
        lookAt: { x: 0, y: 0, z: 0 },
    },
};
