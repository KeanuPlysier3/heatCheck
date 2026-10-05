import * as THREE from 'three/webgpu';
import { Colors } from '../constants/colors';
import { Outline } from '../constants/outline';

// turns an outline geometry into the black shell that goes around an object.
// the geometry passed in must be the object's own shape, made Outline.thickness bigger on every side.
// add the returned mesh as a child of the object's mesh, so it follows its position and rotation.
export const createOutlineMesh = (outlineGeometry) => {
    // MeshBasicMaterial ignores light, so the outline is the same black from every angle
    // BackSide: only the inside walls of the shell are drawn. the half between the camera and the object
    // is invisible, the half behind the object shows as a black edge sticking out around it
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: Colors.outline, side: THREE.BackSide });
    const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outlineMesh.visible = Outline.enabled; // one switch in constants/outline.js hides every outline
    return outlineMesh;
};
