import * as THREE from 'three/webgpu';
import { Player } from '../constants/player';
import { Colors } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';
import { Court } from '../constants/court';


export const createPlayer = () => {
    const joints = { left: {}, right: {} };
    const player = new THREE.Object3D();


    const headMaterial = new THREE.MeshBasicMaterial({ color: Colors.player });
    const headGeometry = new THREE.SphereGeometry(Player.headRadius, 32, 32);
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(0, Player.headY, 0);
    headMesh.castShadow = true;
    player.add(headMesh);

    // head outline: the same sphere, Outline.thickness bigger all round
    const headOutlineGeometry = new THREE.SphereGeometry(Player.headRadius + Outline.thickness, 32, 32);
    const headOutlineMesh = createOutlineMesh(headOutlineGeometry);
    headMesh.add(headOutlineMesh);

 
    const torsoMaterial = new THREE.MeshBasicMaterial({ color: Colors.player });
    const torsoGeometry = new THREE.BoxGeometry(Player.torsoWidth, Player.torsoHeight, Player.torsoDepth);
    const torsoMesh = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torsoMesh.position.set(0, Player.hipY + Player.torsoHeight / 2, 0);
    torsoMesh.castShadow = true;
    player.add(torsoMesh);

    // torso outline: the same box, Outline.thickness bigger on every side
    const torsoOutlineGeometry = new THREE.BoxGeometry(Player.torsoWidth + Outline.thickness * 2, Player.torsoHeight + Outline.thickness * 2, Player.torsoDepth + Outline.thickness * 2);
    const torsoOutlineMesh = createOutlineMesh(torsoOutlineGeometry);
    torsoMesh.add(torsoOutlineMesh);

    const legWidth = Player.legRadius * 2; 
    [Player.legSpacing, -Player.legSpacing].forEach((x) => {

        const legMaterial = new THREE.MeshBasicMaterial({ color: Colors.player });
        const legGeometry = new THREE.BoxGeometry(legWidth, Player.legLength, legWidth);
        const legMesh = new THREE.Mesh(legGeometry, legMaterial);
        legMesh.position.set(x, Player.hipY - Player.legLength / 2, 0);
        legMesh.castShadow = true;
        player.add(legMesh);

        // leg outline: the same box, Outline.thickness bigger on every side
        const legOutlineGeometry = new THREE.BoxGeometry(legWidth + Outline.thickness * 2, Player.legLength + Outline.thickness * 2, legWidth + Outline.thickness * 2);
        const legOutlineMesh = createOutlineMesh(legOutlineGeometry);
        legMesh.add(legOutlineMesh);

     
        const footMaterial = new THREE.MeshBasicMaterial({ color: Colors.player });
        const footGeometry = new THREE.BoxGeometry(Player.footWidth, Player.footHeight, Player.footLength);
        const footMesh = new THREE.Mesh(footGeometry, footMaterial);
        footMesh.position.set(x, Player.footHeight / 2, (Player.footLength - legWidth) / 2);
        footMesh.castShadow = true;
        player.add(footMesh);

        // foot outline: the same box, Outline.thickness bigger on every side
        const footOutlineGeometry = new THREE.BoxGeometry(Player.footWidth + Outline.thickness * 2, Player.footHeight + Outline.thickness * 2, Player.footLength + Outline.thickness * 2);
        const footOutlineMesh = createOutlineMesh(footOutlineGeometry);
        footMesh.add(footOutlineMesh);
    });

//shoulder contains the upper arm, and elbow. Elbow contains lower arm.
    const armWidth = Player.armRadius * 2; 
    [Player.shoulderX, -Player.shoulderX].forEach((x) => {
        const shoulder = new THREE.Object3D();
        shoulder.position.set(x, Player.shoulderY, 0);
        player.add(shoulder);

        const upperArmMaterial = new THREE.MeshBasicMaterial({ color: Colors.player });
        const upperArmGeometry = new THREE.BoxGeometry(armWidth, Player.upperArmLength, armWidth);
        const upperArmMesh = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
        upperArmMesh.position.y = -Player.upperArmLength / 2; // half its length below the shoulder, so its top is at the joint
        upperArmMesh.castShadow = true;
        shoulder.add(upperArmMesh);

        // upper arm outline: the same box, Outline.thickness bigger on every side
        const upperArmOutlineGeometry = new THREE.BoxGeometry(armWidth + Outline.thickness * 2, Player.upperArmLength + Outline.thickness * 2, armWidth + Outline.thickness * 2);
        const upperArmOutlineMesh = createOutlineMesh(upperArmOutlineGeometry);
        upperArmMesh.add(upperArmOutlineMesh);

        const elbow = new THREE.Object3D();
        elbow.position.y = -Player.upperArmLength; // the bottom end of the upper arm
        shoulder.add(elbow);

        const lowerArmMaterial = new THREE.MeshBasicMaterial({ color: Colors.player });
        const lowerArmGeometry = new THREE.BoxGeometry(armWidth, Player.forearmLength, armWidth);
        const lowerArmMesh = new THREE.Mesh(lowerArmGeometry, lowerArmMaterial);
        lowerArmMesh.position.y = -Player.forearmLength / 2; // half its length below the elbow
        lowerArmMesh.castShadow = true;
        elbow.add(lowerArmMesh);

        // lower arm outline: the same box, Outline.thickness bigger on every side
        const lowerArmOutlineGeometry = new THREE.BoxGeometry(armWidth + Outline.thickness * 2, Player.forearmLength + Outline.thickness * 2, armWidth + Outline.thickness * 2);
        const lowerArmOutlineMesh = createOutlineMesh(lowerArmOutlineGeometry);
        lowerArmMesh.add(lowerArmOutlineMesh);

        // the player faces +z (the hoop), and seen from there its left arm is the one on the +x side
        const side = x > 0 ? 'left' : 'right';
        joints[side].shoulder = shoulder;
        joints[side].elbow = elbow;
    });

       player.position.set(Court.spots[0].x, 0, Court.spots[0].z);// the player is 1.5 metres from the hoop, facing it
       player.rotation.y = 3 * Math.PI/2; // the player faces +z, the hoop is at -z, so turn the player around

    return { player, joints};
};
