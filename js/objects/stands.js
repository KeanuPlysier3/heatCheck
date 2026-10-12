import * as THREE from 'three/webgpu';
import { Stands } from '../constants/stands';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

const litMaterial = (color) => new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: SelfLight });

// a box with its outline as a child
const outlinedBox = (width, height, depth, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.add(createOutlineMesh(new THREE.BoxGeometry(width + Outline.thickness * 2, height + Outline.thickness * 2, depth + Outline.thickness * 2)));
    return mesh;
};

// bleachers facing the court: rows that step up away from it (towards -z), each with a seat plank on top,
// and a railing behind the top row
export const createStands = () => {
    const stands = new THREE.Object3D();
    const frame = litMaterial(Colors.standFrame);
    const seat = litMaterial(Colors.standSeat);

    for (let row = 0; row < Stands.rows; row++) {
        // one row: a solid step from the ground up to this row's height. row 0 is the lowest, nearest the court,
        // every next row is one rowDepth further back and one rowRise higher
        const stepHeight = (row + 1) * Stands.rowRise;
        const stepZ = Stands.frontZ - (row + 0.5) * Stands.rowDepth; // the middle of this row, front to back
        const step = outlinedBox(Stands.width, stepHeight, Stands.rowDepth, frame);
        step.position.set(0, Stands.groundY + stepHeight / 2, stepZ); // a box is centred on its middle
        stands.add(step);

        // the seat: a thin plank on top of the step, sticking out a little over its front edge
        const plankDepth = Stands.rowDepth + Stands.seatOverhang;
        const plank = outlinedBox(Stands.width, Stands.seatThickness, plankDepth, seat);
        plank.position.set(0, Stands.groundY + stepHeight + Stands.seatThickness / 2, stepZ + Stands.seatOverhang / 2);
        stands.add(plank);
    }

    // railing behind the top row: posts along the back edge, and a bar on top of them
    const topY = Stands.groundY + Stands.rows * Stands.rowRise + Stands.seatThickness; // the top seat's surface
    const backZ = Stands.frontZ - Stands.rows * Stands.rowDepth + Stands.railPostSize / 2; // just inside the back edge
    const posts = Math.ceil(Stands.width / Stands.railPostSpacing); // the gaps between posts
    for (let i = 0; i <= posts; i++) {
        const x = -Stands.width / 2 + (Stands.width * i) / posts; // evenly spread, one at each end
        const post = outlinedBox(Stands.railPostSize, Stands.railHeight, Stands.railPostSize, frame);
        post.position.set(x, topY + Stands.railHeight / 2, backZ);
        stands.add(post);
    }
    const bar = outlinedBox(Stands.width, Stands.railThickness, Stands.railThickness, frame);
    bar.position.set(0, topY + Stands.railHeight, backZ);
    stands.add(bar);

    return stands;
};
