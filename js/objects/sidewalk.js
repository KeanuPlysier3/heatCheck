import * as THREE from 'three/webgpu';
import { Street, Sidewalk } from '../constants/street';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

// the raised sidewalks along the street and the court, one slab per strip in Sidewalk.strips
export const createSidewalks = () => {
    const sidewalks = new THREE.Object3D();

    const sidewalkMaterial = new THREE.MeshPhongMaterial({ color: Colors.sidewalk, emissive: Colors.sidewalk, emissiveIntensity: SelfLight });

    Sidewalk.strips.forEach((strip) => {
        // a box, so the kerb has a visible edge. it stands on the surround and is Sidewalk.height tall
        const sidewalkGeometry = new THREE.BoxGeometry(strip.width, Sidewalk.height, Street.length);
        const sidewalkMesh = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        sidewalkMesh.position.set(strip.centreX, Street.groundY + Sidewalk.height / 2, 0); // a box is centred on its middle, so lift it by half its height
        sidewalkMesh.receiveShadow = true;
        sidewalks.add(sidewalkMesh);

        // sidewalk outline: the same box, Outline.thickness bigger on every side, like the court's
        const sidewalkOutlineGeometry = new THREE.BoxGeometry(strip.width + Outline.thickness * 2, Sidewalk.height + Outline.thickness * 2, Street.length + Outline.thickness * 2);
        const sidewalkOutlineMesh = createOutlineMesh(sidewalkOutlineGeometry);
        sidewalkMesh.add(sidewalkOutlineMesh);
    });

    return sidewalks;
};
