import { Court } from './court';

// the street and the sidewalks around the court. sizes in metres, like everything else.
// x is across the block (+x is the player's left, where the street is), z runs along it.
// the ground around the court (the surround) is Court.thickness below the court's playing surface
export const Street = {
    groundY: -Court.thickness, // the height of the surround, the street lies on it
    length: Court.surroundDepth, // the street and sidewalks run the whole depth of the surround

    centreX: 14.5, // the middle of the street
    width: 5, // one lane each way, from kerb to kerb

    // the dashed line down the middle
    dashWidth: 0.12,
    dashLength: 2,
    dashGap: 2,

    // the zebra crossing near the camera end
    crosswalkZ: -12, // the middle of the crossing along the street
    crosswalkDepth: 3, // how far the stripes reach along the street
    crosswalkStripeWidth: 0.5,
    crosswalkStripeGap: 0.5,
};

export const Sidewalk = {
    height: 0.15, // the kerb: how far a sidewalk stands above the street
    // each strip: where its middle is on x, and how wide it is
    strips: [
        { centreX: 10.75, width: 2.5 }, // between the court and the street
        { centreX: 18, width: 2 }, // the far side of the street
        { centreX: -10.75, width: 2.5 }, // between the court and the brownstones
    ],
};

// the cross street behind the train track. it runs along x and the street on the court's left (+x) runs into it:
// a T-junction. it lies outside the surround (which ends at z = 15), so it brings its own ground
export const CrossStreet = {
    centreZ: 19, // the middle of the street, along z
    width: 5, // from kerb to kerb, the same as the other street
    fromX: -25, // as wide as the surround
    toX: 25,
    nearSidewalkWidth: 1.5, // the sidewalk between the train track and the street, from z 15
    farSidewalkWidth: 2, // the sidewalk on the far side, in front of the back row of buildings
    groundToZ: 33, // the ground behind it reaches this far, under the back row of buildings
};
