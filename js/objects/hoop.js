import * as THREE from 'three/webgpu';
import { Court } from '../constants/court';
import { Colors } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

export const createHoop = () => {

    const hoop = new THREE.Object3D();


    const {
        rimFromBaseline, poleBehindBaseline,
        poleHeight, poleRadius, armThickness,
        backboardWidth, backboardHeight, backboardThickness, backboardBottom,
        rimHeight, rimRadius, rimThickness,
    } = Court.Hoop;

    // rim
    const rimGeometry = new THREE.TorusGeometry(rimRadius, rimThickness, 16, 100);
    const rimMaterial = new THREE.MeshPhongMaterial({ color: Colors.hoop, emissive: Colors.hoop });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.position.y = rimHeight;
    rimMesh.castShadow = true;
    rimMesh.rotation.x = Math.PI / 2; // a torus stands upright by default, lay it flat
    hoop.add(rimMesh);

    // rim outline
    const rimOutlineGeometry = new THREE.TorusGeometry(rimRadius, rimThickness + Outline.thickness, 16, 100);
    const rimOutlineMesh = createOutlineMesh(rimOutlineGeometry);
    rimMesh.add(rimOutlineMesh);

    // backboard
    const backboardFront = rimRadius + rimThickness; // the ring's outer edge is rimRadius + rimThickness from its centre
    const backboardBack = backboardFront + backboardThickness;
    const backBoardGeometry = new THREE.BoxGeometry(backboardWidth, backboardHeight, backboardThickness);
    const backBoardMaterial = new THREE.MeshPhongMaterial({ color: Colors.hoopBackboard, emissive: Colors.hoopBackboard });
    const backBoardMesh = new THREE.Mesh(backBoardGeometry, backBoardMaterial);
    backBoardMesh.position.set(0, backboardBottom + backboardHeight / 2, backboardFront + backboardThickness / 2);
    backBoardMesh.castShadow = true;
    hoop.add(backBoardMesh);

    // backboard outline
    const backBoardOutlineGeometry = new THREE.BoxGeometry(backboardWidth + Outline.thickness * 2, backboardHeight + Outline.thickness * 2, backboardThickness + Outline.thickness * 2);
    const backBoardOutlineMesh = createOutlineMesh(backBoardOutlineGeometry);
    backBoardMesh.add(backBoardOutlineMesh);

    // pole
    const poleZ = rimFromBaseline + poleBehindBaseline; // from the rim to the baseline, then on to the pole
    const poleLength = poleHeight + Court.thickness; // from the surround up to the top
    const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius, poleLength);
    const poleMaterial = new THREE.MeshPhongMaterial({ color: Colors.hoopPole, emissive: Colors.hoopPole });
    const poleMesh = new THREE.Mesh(poleGeometry, poleMaterial);
    poleMesh.position.set(0, (poleHeight - Court.thickness) / 2, poleZ); // a cylinder is centred on its middle: halfway between its foot (-Court.thickness) and its top (poleHeight)
    poleMesh.castShadow = true;
    hoop.add(poleMesh);

    // pole outline
    const poleOutlineGeometry = new THREE.CylinderGeometry(poleRadius + Outline.thickness, poleRadius + Outline.thickness, poleLength + Outline.thickness * 2);
    const poleOutlineMesh = createOutlineMesh(poleOutlineGeometry);
    poleMesh.add(poleOutlineMesh);

    // pole arm
    const armLength = poleZ - backboardBack;
    const armGeometry = new THREE.BoxGeometry(armThickness, armThickness, armLength);
    const armMaterial = new THREE.MeshPhongMaterial({ color: Colors.hoopPole, emissive: Colors.hoopPole });
    const armMesh = new THREE.Mesh(armGeometry, armMaterial);
    armMesh.position.set(0, backboardBottom + backboardHeight / 2, (backboardBack + poleZ) / 2); // at the height of the backboard's middle, halfway between its two ends
    armMesh.castShadow = true;
    hoop.add(armMesh);

    // pole arm outline
    const armOutlineGeometry = new THREE.BoxGeometry(armThickness + Outline.thickness * 2, armThickness + Outline.thickness * 2, armLength + Outline.thickness * 2);
    const armOutlineMesh = createOutlineMesh(armOutlineGeometry);
    armMesh.add(armOutlineMesh);

    // position
    hoop.position.set(0, 0, Court.Hoop.rimZ);

    return hoop;
};
