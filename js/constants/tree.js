// the street trees: a box trunk with a crown of a few big cubes. sizes in metres.
// "min" and "max" pairs are the range a random value is picked from, so no two trees are the same
export const Tree = {
    trunkWidth: 0.3,
    trunkHeight: 2.2, // from the sidewalk to where the crown starts

    leafCountMin: 3, // how many cubes make up one crown
    leafCountMax: 4,
    leafSizeMin: 1.0, // the edge length of one leaf cube
    leafSizeMax: 1.6,
    leafSpread: 0.5, // how far a cube can sit from the trunk's centre line, sideways
    leafRise: 0.8, // how far above the top of the trunk a cube can sit
    leafTilt: 0.35, // how far a cube can be tipped over (radians, about 20°), so the crown looks loose

    // where they stand: along each sidewalk strip, one tree per slot of this length, moved a little at random
    slotLength: 6, // 30 m of sidewalk gives 5 slots
    slotJitter: 1.5, // how far a tree can move from the middle of its slot, along the sidewalk
    chance: 0.7, // the chance that a slot gets a tree, so the rows have gaps
};
