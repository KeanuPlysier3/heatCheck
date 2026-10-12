// all sizes are in metres: 1 unit in the scene = 1 metre
// the court is centred on the origin and its playing surface is at y = 0
export const Court = {
    width: 15, // along x
    depth: 14, // along z, half of a 28 m court
    thickness: 0.2, // how far the slab sticks out above the surround
    surroundWidth: 50,
    surroundDepth: 30,


    threePoint: {
        radius: 6.75, // measured from the point under the rim
        cornerX: 6.6, // the straight corner pieces, measured from the centre line
        lineWidth: 0.15, // the width of the line, measured from its centre
        spotBehindLine: 0.5, // the shooting spots are this far outside the line
    },

    // the key (the painted rectangle in front of the hoop), official FIBA sizes
    key: {
        width: 4.9, // along x, centred on the hoop
        length: 5.8, // along z, from the baseline to the free-throw line
        freeThrowCircleRadius: 1.8, // the circle centred on the middle of the free-throw line
        noChargeRadius: 1.25, // the small semicircle under the hoop, measured from the point under the rim
    },

    Hoop: {
        rimFromBaseline: 1.575, // official: centre of the rim to the baseline. everything else is placed from the rim
        poleBehindBaseline: 0.6, // the pole stands off the court, this far behind the baseline
        poleHeight: 3.5, // top of the pole above the playing surface
        poleRadius: 0.1,
        armThickness: 0.12, // the beam from the pole to the back of the backboard
        backboardWidth: 1.8,
        backboardHeight: 1.05,
        backboardThickness: 0.05,
        backboardBottom: 2.9, // bottom edge above the floor
        rimHeight: 3.05, // above the floor
        rimRadius: 0.225, // from the centre of the ring to the centre of its tube
        rimThickness: 0.025, // radius of the tube
    }
};

// the centre of the rim on the z axis. it only depends on the court and rimFromBaseline,
// so changing the pole, the arm or the backboard never moves it
Court.Hoop.rimZ = Court.depth / 2 - Court.Hoop.rimFromBaseline;

// the five shooting spots around the three-point line, in the order they are played:
// corner, wing, top, wing, corner. left and right are the player's own, facing the hoop,
// so left is the +x side. each spot is on the floor (y = 0) and has:
//   x, z    where the player stands
//   facing  the angle (radians) to turn the player around y so it looks at the rim
const makeSpot = (name, x, z) => ({
    name, x, z,
    facing: Math.atan2(0 - x, Court.Hoop.rimZ - z), // the rim is at x = 0, z = rimZ. 0 = facing +z
});

// a spot on the arc: degrees is the angle around the rim, 90 = straight in front of the hoop
const makeArcSpot = (name, degrees) => {
    const angle = degrees * Math.PI / 180;
    const distance = Court.threePoint.radius + Court.threePoint.spotBehindLine;
    return makeSpot(name, distance * Math.cos(angle), Court.Hoop.rimZ - distance * Math.sin(angle));
};

// a corner spot: beside the straight piece of the line, level with the rim
const makeCornerSpot = (name, side) =>
    makeSpot(name, side * (Court.threePoint.cornerX + Court.threePoint.spotBehindLine), Court.Hoop.rimZ);

Court.spots = [
    makeCornerSpot('left corner', 1),
    makeArcSpot('left wing', 45),
    makeArcSpot('top', 90),
    makeArcSpot('right wing', 135),
    makeCornerSpot('right corner', -1),
    // index 5, not part of the rotation: the deep shot, straight in front of the hoop and way behind the line,
    // worth extra points. only reached through a hot streak in downtown countdown
    makeSpot('deep', 0, Court.Hoop.rimZ - 12.5), // 9.5 m from the rim, the arc spots are 7.25 m
];

// how many spots the normal rotation walks through (0 to 4), so the deep spot at index 5 is never part of it
Court.rotationSpots = 5;
