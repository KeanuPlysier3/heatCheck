import * as THREE from 'three/webgpu';
import { Court } from '../constants/court';
import { Colors } from '../constants/colors';

export const createHoop = () => {
    // empty container, so the whole hoop can be moved or hidden as one thing
    const hoop = new THREE.Object3D();

    // pole: stands on the hoop's origin
    const poleHeight = 3.5;
    const poleRadius = 0.1;
    const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight);
    const poleMaterial = new THREE.MeshPhongMaterial({ color: Colors.hoopPole, emissive: Colors.hoopPole });
    const poleMesh = new THREE.Mesh(poleGeometry, poleMaterial);
    poleMesh.position.y = poleHeight / 2; // a cylinder is centred on its middle, lift it so its base is on the floor
    poleMesh.castShadow = true;
    hoop.add(poleMesh);

    // backboard: in front of the pole, on the side facing the court
    const backboardWidth = 1.8;
    const backboardHeight = 1.05;
    const backboardThickness = 0.05;
    const backboardBottom = 2.9; // bottom edge above the floor
    const backBoardGeometry = new THREE.BoxGeometry(backboardWidth, backboardHeight, backboardThickness);
    const backBoardMaterial = new THREE.MeshPhongMaterial({ color: Colors.hoopBackboard, emissive: Colors.hoopBackboard });
    const backBoardMesh = new THREE.Mesh(backBoardGeometry, backBoardMaterial);
    backBoardMesh.position.set(0, backboardBottom + backboardHeight / 2, -(poleRadius + backboardThickness / 2));
    backBoardMesh.castShadow = true;
    hoop.add(backBoardMesh);

    // rim: a ring lying flat, its back edge touching the front of the backboard
    const rimHeight = 3.05; // above the floor
    const rimRadius =  0.225; // from the centre of the ring to the centre of its tube
    const rimThickness = 0.025; // radius of the tube
    const rimGeometry = new THREE.TorusGeometry(rimRadius, rimThickness, 16, 100);
    const rimMaterial = new THREE.MeshPhongMaterial({ color: Colors.hoop, emissive: Colors.hoop });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    const backboardFront = -(poleRadius + backboardThickness); // z of the backboard's face on the court side
    rimMesh.position.set(0, rimHeight, backboardFront - (rimRadius + rimThickness)); // the ring's outer edge is rimRadius + rimThickness from its centre
    rimMesh.castShadow = true;
    rimMesh.rotation.x = Math.PI / 2; // a torus stands upright by default, lay it flat
    hoop.add(rimMesh);

    // place the complete hoop on the court: this one line moves every part
    hoop.position.set(0, 0, Court.depth / 2);

    return hoop;
};
