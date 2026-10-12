import { Court } from './court';
import { Fence } from './fence';

// the bleachers at the camera end of the court, where the fence used to close it off. sizes in metres.
// they rise in steps away from the court, so every row looks over the one in front at the hoop
export const Stands = {
    groundY: -Court.thickness, // the surround's height, the stands stand on it

    width: Fence.maxX - Fence.minX, // as wide as the cage, so they close it off where the fence was
    frontZ: Fence.minZ - 0.2, // the lowest row starts just behind where the fence stood

    rows: 4,
    rowDepth: 0.9, // how deep one step is, front to back
    rowRise: 0.45, // how much higher each row is than the one in front

    seatThickness: 0.08, // the plank on top of every row
    seatOverhang: 0.06, // how far the plank sticks out over the step's front edge

    // the railing along the back of the top row
    railHeight: 1.0, // above the top seat
    railPostSize: 0.08,
    railPostSpacing: 2.5,
    railThickness: 0.06,
};
