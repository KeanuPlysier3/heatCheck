import { Court } from './court';

// the concrete wall behind the hoop, with a mural painted on the side that faces the court. sizes in metres.
// the game camera looks towards the hoop, so this wall is in view in every shot
export const Wall = {
    groundY: -Court.thickness, // the surround's height, the wall stands on it
    centreZ: 10.25, // behind the fence (z 9), in front of the train track (from z 12.8)
    width: 19, // along x, a little wider than the fence
    height: 4.5,
    thickness: 0.5,

    copingHeight: 0.2, // the cap along the top of the wall
    copingOverhang: 0.1, // how far the cap sticks out on each side

    // the painted face
    pixelsPerMetre: 40, // how sharp the mural is: 19 x 4.5 m gives a 760 x 180 pixel canvas

    text: 'HEAT CHECK', // the big letters in the middle
    textHeight: 2.0, // how tall the letters are
};
