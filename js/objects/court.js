import * as THREE from 'three/webgpu';
import { Court } from '../constants/court';
import { Colors } from '../constants/colors';

export const createCourt = () => {
    // empty container, so the whole court can be moved or hidden as one thing
    const court = new THREE.Object3D();

    // the area around the court, one slab-thickness below the playing surface
    const surroundGeometry = new THREE.PlaneGeometry(Court.surroundWidth, Court.surroundDepth);
    const surroundMaterial = new THREE.MeshPhongMaterial({ color: Colors.surround });
    const surroundMesh = new THREE.Mesh(surroundGeometry, surroundMaterial);
    surroundMesh.rotation.x = Math.PI * -.5; // a plane stands upright by default, lay it flat
    surroundMesh.position.y = -Court.thickness; // lower than the playing surface, two surfaces at the same height would flicker
    surroundMesh.receiveShadow = true;
    court.add(surroundMesh);

    // the playing surface: a slab, a box is already flat so it needs no rotation
    const floorGeometry = new THREE.BoxGeometry(Court.width, Court.thickness, Court.depth);
    const floorMaterial = new THREE.MeshPhongMaterial({ color: Colors.wood });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.position.y = -Court.thickness / 2; // a box is centred on its middle, move it down so its top is exactly at y = 0
    floorMesh.receiveShadow = true;
    court.add(floorMesh);

    return court;
};
