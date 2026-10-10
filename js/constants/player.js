// all sizes are in metres, like the court: 1 unit in the scene = 1 metre

export const Player = {
    // feet: small boxes
    footWidth: 0.11,
    footHeight: 0.08,
    footLength: 0.26,

    // legs: one capsule each. lengths of capsules are the full length, rounded ends included
    legLength: 0.8,
    legRadius: 0.09,
    legSpacing: 0.11, // each leg's centre is this far to the side of the body's middle

    // torso: a box
    torsoWidth: 0.42,
    torsoHeight: 0.58,
    torsoDepth: 0.24,

    // head: a sphere
    neckGap: 0.02, // space between the top of the torso and the bottom of the head
    headRadius: 0.16,

    // arms: two capsules each, upper arm (shoulder to elbow) and forearm (elbow to wrist)
    upperArmLength: 0.3,
    forearmLength: 0.3,
    armRadius: 0.06,
    shoulderDrop: 0.06, // the shoulder joint sits this far below the top of the torso

    // low-poly: how many flat sides the round parts get
    radialSegments: 8, // around a capsule or the head
    capSegments: 2, // across a capsule's rounded end
};

// heights and positions that follow from the sizes above, calculated once so nobody has to type them
Player.hipY = Player.footHeight + Player.legLength; // top of the legs, bottom of the torso
Player.shoulderY = Player.hipY + Player.torsoHeight - Player.shoulderDrop; // where the arms hinge
Player.shoulderX = Player.torsoWidth / 2 + Player.armRadius; // the arms hang just outside the torso
Player.headY = Player.hipY + Player.torsoHeight + Player.neckGap + Player.headRadius; // centre of the head
Player.height = Player.headY + Player.headRadius; // top of the head: 1.8


Player.poses = {
    // the ball held in front of the chest, before the shot
    loaded: {
        left: { shoulderX: -30, shoulderZ: 0, elbowX: -50, elbowZ: -10 },
        right: { shoulderX: -50, shoulderZ: 25, elbowX: -50, elbowZ: 0 },
    },
    // the arms up at the moment the ball leaves the hands
    release: {
        left: { shoulderX: -115, shoulderZ: 0, elbowX: -75, elbowZ: -25 },
        right: { shoulderX: -130, shoulderZ: 15, elbowX: 0, elbowZ: 0 },
    },

    default: {
        left: { shoulderX: 0, shoulderZ: 0, elbowX: 0, elbowZ: 0 },
        right: { shoulderX: 0, shoulderZ: 0, elbowX: 0, elbowZ: 0 },
    },

    // the main menu: one hand on the hip, the other pointing at the sky
    // (shoulderZ swings the arm sideways: positive = the left arm out, negative = the right arm out)
    menu: {
        left: { shoulderX: 0, shoulderZ: 40, elbowX: -20, elbowZ: -110 },
        right: { shoulderX: 0, shoulderZ: -165, elbowX: 0, elbowZ: -10 },
    },
};
