import { Court } from './court';

// the chain-link cage around the court. sizes in metres.
// it stands on the surround, a rectangle 1 m outside the court's edges, with a gate on the street side
export const Fence = {
    groundY: -Court.thickness, // the surround's height, the posts stand on it

    // the rectangle: the court is x -7.5 to 7.5 and z -7 to 7, the hoop's pole stands at z 7.6
    minX: -8.5,
    maxX: 8.5,
    minZ: -8, // the camera end
    maxZ: 9, // behind the hoop

    height: 3.5, // the two long sides. the camera end has no fence, the stands are there
    backHeight: 5.5, // behind the hoop, higher to catch missed shots, like real street courts

    // the gate: a gap in the +x side (the street side, the player's left), near the camera end
    gateFromZ: -6.5,
    gateToZ: -5,

    postRadius: 0.06,
    postSpacing: 3, // at most this far between two posts
    railRadius: 0.04, // the pipe along the top

    // the wire mesh, drawn on a small canvas and repeated
    diamondSize: 0.15, // one diamond of the mesh, in metres
    canvasSize: 64, // the canvas the diamond is drawn on, in pixels
    wireWidth: 5, // the wire's thickness on that canvas, in pixels
};
