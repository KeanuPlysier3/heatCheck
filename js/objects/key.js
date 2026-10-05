import * as THREE from 'three/webgpu';
import { Court } from '../constants/court';
import { Colors } from '../constants/colors';


export const createKey = () => {
    const line = new THREE.Object3D();
   
    const material = new THREE.MeshPhongMaterial({ color: Colors.courtLines });
    const lineHeight = 0.015; // a hair above the slab, so the line doesn't flicker with the floor

    const cornerGeometry = new THREE.PlaneGeometry(Court.threePoint.lineWidth, Court.key.length); //expects two arguemnts, width and height. The width is the line width, the height is the length of the corner piece, which is calculated below.
    const width = Court.key.width;
    [-width / 2, width / 2].forEach((xPos) => {
         const cornerMesh = new THREE.Mesh(cornerGeometry, material);
         cornerMesh.rotation.x = Math.PI * -.5;
         cornerMesh.position.set(xPos, lineHeight, (Court.depth / 2) - (Court.key.length/2)); // a plane is centred on its middle
         cornerMesh.receiveShadow = true;
         line.add(cornerMesh);
    });


    const topGeometry = new THREE.PlaneGeometry(Court.key.width+.1, Court.threePoint.lineWidth); //expects two arguemnts, width and height. The width is the line width, the height is the length of the corner piece, which is calculated below.
    const topMesh = new THREE.Mesh(topGeometry, material);
    topMesh.rotation.x = Math.PI * -.5;
    topMesh.position.set(0, lineHeight, (Court.depth / 2) - Court.key.length); // a plane is centred on its middle
    line.add(topMesh);


    return line;
};
