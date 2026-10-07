import * as THREE from 'three/webgpu';
import { Colors } from '../constants/colors';
import { Outline } from '../constants/outline';


export const createOutlineMesh = (outlineGeometry) => {
    // MeshBasicMaterial ignores light, so the outline is the same black from every angle
    // BackSide: only the inside walls of the shell are drawn. the half between the camera and the object
    // is invisible, the half behind the object shows as a black edge sticking out around it
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: Colors.outline, side: THREE.BackSide });
    const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outlineMesh.visible = Outline.enabled; // one switch in constants/outline.js hides every outline
    return outlineMesh;
};
