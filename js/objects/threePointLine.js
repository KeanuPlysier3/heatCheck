import * as THREE from 'three/webgpu';
import { Court } from '../constants/court';
import { Colors } from '../constants/colors';


export const createThreePointLine = () => {
    const line = new THREE.Object3D();
    const { radius, cornerX } = Court.threePoint;
    const material = new THREE.MeshPhongMaterial({ color: Colors.courtLines });
    const lineHeight = 0.015; // a hair above the slab, so the line doesn't flicker with the floor

    // corner angle
    const cornerAngle = Math.acos(cornerX / radius);

    // arc
    const arcGeometry = new THREE.RingGeometry(
        radius - Court.threePoint.lineWidth / 2,   // inner radius
        radius + Court.threePoint.lineWidth / 2,   // outer radius
        64,                             // segments along the curve, more = smoother
        1,                              // segments across the width
        cornerAngle,                    // where the arc starts
        Math.PI - cornerAngle * 2);     // how far it goes round (half a circle, minus the two corner angles)

    const arcMesh = new THREE.Mesh(arcGeometry, material);
    arcMesh.rotation.x = Math.PI * -.5; // a ring stands upright by default, lay it flat
    arcMesh.position.set(0, lineHeight, Court.Hoop.rimZ); // centred under the rim
    arcMesh.receiveShadow = true;
    line.add(arcMesh);

    // corner pieces
    const baselineZ = Court.depth / 2;
    const arcEndZ = Court.Hoop.rimZ - radius * Math.sin(cornerAngle);//how far in front of the rim the arc ends
    const cornerLength = baselineZ - arcEndZ; //how long the corner pieces are.
    const cornerGeometry = new THREE.PlaneGeometry(Court.threePoint.lineWidth, cornerLength);
    [-cornerX, cornerX].forEach((x) => {
        const cornerMesh = new THREE.Mesh(cornerGeometry, material);
        cornerMesh.rotation.x = Math.PI * -.5;
        cornerMesh.position.set(x, lineHeight, (baselineZ + arcEndZ) / 2); // a plane is centred on its middle
        cornerMesh.receiveShadow = true;
        line.add(cornerMesh);
    });

    return line;
};
