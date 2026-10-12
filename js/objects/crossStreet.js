import * as THREE from 'three/webgpu';
import { Street, Sidewalk, CrossStreet } from '../constants/street';
import { Court } from '../constants/court';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

const litMaterial = (color) => new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: SelfLight });

// a flat rectangle on the ground, from (x1, z1) to (x2, z2), lifted by `lift` so it does not flicker with what is under it
const groundPlane = (x1, x2, z1, z2, lift, material) => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), material);
    plane.rotation.x = Math.PI * -.5; // a plane stands upright by default, lay it flat
    plane.position.set((x1 + x2) / 2, Street.groundY + lift, (z1 + z2) / 2); // a plane is positioned by its middle
    plane.receiveShadow = true;
    return plane;
};

// a raised sidewalk slab from (x1, z1) to (x2, z2), with its outline, like the ones along the other street
const sidewalkSlab = (x1, x2, z1, z2, material) => {
    const width = x2 - x1;
    const depth = z2 - z1;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, Sidewalk.height, depth), material);
    slab.position.set((x1 + x2) / 2, Street.groundY + Sidewalk.height / 2, (z1 + z2) / 2);
    slab.receiveShadow = true;
    slab.add(createOutlineMesh(new THREE.BoxGeometry(width + Outline.thickness * 2, Sidewalk.height + Outline.thickness * 2, depth + Outline.thickness * 2)));
    return slab;
};

// the street behind the train track, running along x, with sidewalks on both sides and the ground under the
// buildings behind it. the street on the court's left runs into it
export const createCrossStreet = () => {
    const crossStreet = new THREE.Object3D();
    const { fromX, toX } = CrossStreet;

    // where everything lies along z, from the court outwards
    const surroundEndZ = Court.surroundDepth / 2; // 15: the court's ground ends here
    const streetNearZ = CrossStreet.centreZ - CrossStreet.width / 2; // the near kerb
    const streetFarZ = CrossStreet.centreZ + CrossStreet.width / 2; // the far kerb
    const nearSidewalkZ = streetNearZ - CrossStreet.nearSidewalkWidth;
    const farSidewalkZ = streetFarZ + CrossStreet.farSidewalkWidth;

    // the left street's two kerbs: the cross street's near sidewalk has to stop there to let it through
    const leftStreetNearX = Street.centreX - Street.width / 2; // 12
    const leftStreetFarX = Street.centreX + Street.width / 2; // 17

    // ground: the same asphalt grey as the court's surround, from where that ends to behind the back row of buildings
    crossStreet.add(groundPlane(fromX, toX, surroundEndZ, CrossStreet.groundToZ, 0, litMaterial(Colors.surround)));

    // asphalt: the cross street itself, and the last piece of the left street up to it, so the two join
    const asphalt = litMaterial(Colors.street);
    crossStreet.add(groundPlane(fromX, toX, streetNearZ, streetFarZ, 0.01, asphalt));
    crossStreet.add(groundPlane(leftStreetNearX, leftStreetFarX, surroundEndZ, streetNearZ, 0.01, asphalt));

    // sidewalks: the near one in two pieces with the left street's mouth between them, the far one in one piece
    const concrete = litMaterial(Colors.sidewalk);
    crossStreet.add(sidewalkSlab(fromX, leftStreetNearX, nearSidewalkZ, streetNearZ, concrete));
    crossStreet.add(sidewalkSlab(leftStreetFarX, toX, nearSidewalkZ, streetNearZ, concrete));
    crossStreet.add(sidewalkSlab(fromX, toX, streetFarZ, farSidewalkZ, concrete));

    // dashed centre line along x, the same dashes as the other street, left out where the two streets meet
    const dashMaterial = litMaterial(Colors.streetLine);
    const dashStep = Street.dashLength + Street.dashGap;
    for (let x = fromX + Street.dashLength / 2; x < toX; x += dashStep) {
        const inJunction = x + Street.dashLength / 2 > leftStreetNearX && x - Street.dashLength / 2 < leftStreetFarX;
        if (inJunction) continue;
        const dash = groundPlane(x - Street.dashLength / 2, x + Street.dashLength / 2, CrossStreet.centreZ - Street.dashWidth / 2, CrossStreet.centreZ + Street.dashWidth / 2, 0.02, dashMaterial);
        crossStreet.add(dash);
    }

    return crossStreet;
};
