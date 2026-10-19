import * as THREE from 'three/webgpu';
import { Stands } from '../constants/stands';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

const litMaterial = (color) => new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: SelfLight });

// outlined box
const outlinedBox = (width, height, depth, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.add(createOutlineMesh(new THREE.BoxGeometry(width + Outline.thickness * 2, height + Outline.thickness * 2, depth + Outline.thickness * 2)));
    return mesh;
};

// stands
export const createStands = () => {
    const stands = new THREE.Object3D();
    const frame = litMaterial(Colors.standFrame);
    const seat = litMaterial(Colors.standSeat);

    for (let row = 0; row < Stands.rows; row++) {
        // step
        const stepHeight = (row + 1) * Stands.rowRise;
        const stepZ = Stands.frontZ - (row + 0.5) * Stands.rowDepth; // the middle of this row, front to back
        const step = outlinedBox(Stands.width, stepHeight, Stands.rowDepth, frame);
        step.position.set(0, Stands.groundY + stepHeight / 2, stepZ); // a box is centred on its middle
        stands.add(step);

        // seat
        const plankDepth = Stands.rowDepth + Stands.seatOverhang;
        const plank = outlinedBox(Stands.width, Stands.seatThickness, plankDepth, seat);
        plank.position.set(0, Stands.groundY + stepHeight + Stands.seatThickness / 2, stepZ + Stands.seatOverhang / 2);
        stands.add(plank);
    }

    // railing
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
