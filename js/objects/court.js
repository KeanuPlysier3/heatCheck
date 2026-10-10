import * as THREE from 'three/webgpu';
import { Court } from '../constants/court';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';
import { createThreePointLine } from './threePointLine';
import { createKey } from './key';

export const createCourt = () => {
    // empty container, so the whole court can be moved or hidden as one thing
    const court = new THREE.Object3D();

    // the area around the court, one slab-thickness below the playing surface
    const surroundGeometry = new THREE.PlaneGeometry(Court.surroundWidth, Court.surroundDepth);
    const surroundMaterial = new THREE.MeshPhongMaterial({ color: Colors.surround, emissive: Colors.surround, emissiveIntensity: SelfLight });
    const surroundMesh = new THREE.Mesh(surroundGeometry, surroundMaterial);
    surroundMesh.rotation.x = Math.PI * -.5; // a plane stands upright by default, lay it flat
    surroundMesh.position.y = -Court.thickness; // lower than the playing surface, two surfaces at the same height would flicker
    surroundMesh.receiveShadow = true;
    court.add(surroundMesh);

    const floorTexture = new THREE.TextureLoader().load('textures/courtTexture2.jpg'); // the file is in public/textures/, public/ is served as the site's root
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.wrapS = THREE.RepeatWrapping;   // repeat horizontally
    floorTexture.wrapT = THREE.RepeatWrapping;   // repeat vertically
    floorTexture.repeat.set(2, 2);               // 2 copies across, 2 copies along
    const floorMaterial = new THREE.MeshPhongMaterial({
        map: floorTexture,          // the grain, cracks, speckles
        color: Colors.court,   // tints all of it teal
        emissive: Colors.court,        // the same teal, given off by the surface itself
        emissiveMap: floorTexture,     // so the grain and cracks stay visible in the glow
        emissiveIntensity: SelfLight,
    });

    // the playing surface: a slab, a box is already flat so it needs no rotation
    const floorGeometry = new THREE.BoxGeometry(Court.width, Court.thickness, Court.depth);

    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.position.y = -Court.thickness / 2; // a box is centred on its middle, move it down so its top is exactly at y = 0
    floorMesh.receiveShadow = true;
    court.add(floorMesh);

    // floor outline: the same box, Outline.thickness bigger on every side
    const floorOutlineGeometry = new THREE.BoxGeometry(Court.width + Outline.thickness * 2, Court.thickness + Outline.thickness * 2, Court.depth + Outline.thickness * 2);
    const floorOutlineMesh = createOutlineMesh(floorOutlineGeometry);
    floorMesh.add(floorOutlineMesh);

    const line = createThreePointLine();
    court.add(line);

    const key = createKey();
    court.add(key);

    return court;
};
