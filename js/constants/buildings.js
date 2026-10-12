import { Court } from './court';
import { Colors } from './colors';

// the buildings on both sides of the block: simple boxes with their windows painted on the front.
// sizes in metres. every building stands on the surround and has its front facing the court
export const Buildings = {
    groundY: -Court.thickness, // the surround's height

    storeyHeight: 3, // one floor
    windowsPerStorey: 3,
    windowWidth: 0.9,
    windowHeight: 1.4,
    litChance: 0.35, // the chance that a window has its light on
    pixelsPerMetre: 24, // how sharp the painted front is

    corniceHeight: 0.4, // the ledge along the top of every building
    corniceOverhang: 0.3, // how far it sticks out over the front

    // the brownstone row on the -x side, behind the sidewalk. the fronts face +x, towards the court
    brownstones: {
        frontX: -13, // where the fronts stand, just behind the sidewalk (which ends at -12)
        depth: 10, // from the front backwards, away from the court
        width: 5, // along the street, each house
        firstZ: -12.5, // where the first house starts, along z
        count: 5,
        heightMin: 10,
        heightMax: 13,
        colors: [Colors.brownstone, Colors.brownstoneRed, Colors.brownstone, Colors.brownstoneDark],
        // the stoop: steep steps from the front door down to the sidewalk
        stoopWidth: 1.6,
        stoopSteps: 4,
        stoopStepHeight: 0.3,
        stoopStepDepth: 0.35,
    },

    // the buildings across the street on the +x side. the fronts face -x, towards the court.
    farSide: {
        frontX: 19, // just behind the far sidewalk (which ends at 19)
        depth: 6, // to the edge of the surround at 25
        blocks: [
            { fromZ: 4, toZ: 12, height: 8, color: Colors.brownstone },
            { fromZ: -4, toZ: 4, height: 12, color: Colors.brownstoneRed },
            { fromZ: -12, toZ: -4, height: 10, color: Colors.brownstoneDark },
        ],
    },

    // the row behind the cross street, past the train track. the fronts face -z, back towards the court
    backRow: {
        frontZ: 23.5, // just behind the cross street's far sidewalk
        depth: 8,
        blocks: [
            { fromX: -25, toX: -18, height: 11, color: Colors.brownstoneDark },
            { fromX: -18, toX: -11, height: 14, color: Colors.brownstoneRed },
            { fromX: -11, toX: -4, height: 9, color: Colors.brownstone },
            { fromX: -4, toX: 4, height: 13, color: Colors.brownstoneDark },
            { fromX: 4, toX: 11, height: 10, color: Colors.brownstoneRed },
            { fromX: 11, toX: 18, height: 15, color: Colors.brownstone },
            { fromX: 18, toX: 25, height: 12, color: Colors.brownstoneRed },
        ],
    },

    // water towers on a few roofs: [which side, which building]
    waterTowers: [
        { side: 'brownstones', index: 1 },
        { side: 'brownstones', index: 3 },
        { side: 'farSide', index: 1 },
        { side: 'backRow', index: 1 },
        { side: 'backRow', index: 5 },
    ],
    waterTowerRadius: 1.1,
    waterTowerHeight: 2.2,
    waterTowerLegs: 1.4, // how high the barrel stands above the roof
};
