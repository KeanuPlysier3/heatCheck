import * as THREE from 'three/webgpu';
import { Street, Sidewalk } from '../constants/street';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

// sidewalks
export const createSidewalks = () => {
    const sidewalks = new THREE.Object3D();

    const sidewalkMaterial = new THREE.MeshPhongMaterial({ color: Colors.sidewalk, emissive: Colors.sidewalk, emissiveIntensity: SelfLight });

    Sidewalk.strips.forEach((strip) => {
        // sidewalk
        const sidewalkGeometry = new THREE.BoxGeometry(strip.width, Sidewalk.height, Street.length);
        const sidewalkMesh = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        sidewalkMesh.position.set(strip.centreX, Street.groundY + Sidewalk.height / 2, 0); // a box is centred on its middle, so lift it by half its height
        sidewalkMesh.receiveShadow = true;
        sidewalks.add(sidewalkMesh);

        // sidewalk outline
        const sidewalkOutlineGeometry = new THREE.BoxGeometry(strip.width + Outline.thickness * 2, Sidewalk.height + Outline.thickness * 2, Street.length + Outline.thickness * 2);
        const sidewalkOutlineMesh = createOutlineMesh(sidewalkOutlineGeometry);
        sidewalkMesh.add(sidewalkOutlineMesh);
    });

    return sidewalks;
};
