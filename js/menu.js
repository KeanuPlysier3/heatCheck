import * as THREE from 'three/webgpu';
import { createPlayer } from './objects/player';
import { Player } from './constants/player';
import { resizeRendererToDisplaySize } from './helpers/resizeRenderer.js';

// the 3D part of the main menu: its own canvas, renderer, scene and camera, showing the player.
// everything here is private to this file, script.js only uses createMenu, showMenu and hideMenu
let menuElement;   // the #menu div: the buttons and the canvas
let menuRenderer;
let menuScene;
let menuCamera;

const menuRender = () => {
    if (resizeRendererToDisplaySize(menuRenderer)) {
        const menuCanvas = menuRenderer.domElement;
        menuCamera.aspect = menuCanvas.clientWidth / menuCanvas.clientHeight;
        menuCamera.updateProjectionMatrix();
    }

    menuRenderer.render(menuScene, menuCamera);
};

// builds the menu and starts drawing it. call this once, at startup
export const createMenu = async () => {
    menuElement = document.querySelector('#menu');
    const menuCanvas = document.querySelector('#menu__canvas');

    menuRenderer = new THREE.WebGPURenderer({
        canvas: menuCanvas,   // the option has to be called "canvas"; a bare menuCanvas would be ignored
        alpha: true,
        antialias: true
    });

    menuRenderer.shadowMap.enabled = true; // enable shadow maps

    menuScene = new THREE.Scene();

    menuCamera = new THREE.PerspectiveCamera(75, menuCanvas.clientWidth / menuCanvas.clientHeight, 0.1, 100);

    const player = createPlayer();
    const menuPlayerMesh = player.player;
    menuPlayerMesh.position.set(0, 0, 0);
    menuPlayerMesh.rotation.y = Math.PI; // face the camera
    menuScene.add(menuPlayerMesh);

    // the menu pose, set straight on the joints that createPlayer hands back (the poses are written in degrees)
    ['left', 'right'].forEach((side) => {
        const { shoulder, elbow } = player.joints[side];
        const pose = Player.poses.menu[side];
        shoulder.rotation.x = THREE.MathUtils.degToRad(pose.shoulderX);
        shoulder.rotation.z = THREE.MathUtils.degToRad(pose.shoulderZ);
        elbow.rotation.x = THREE.MathUtils.degToRad(pose.elbowX);
        elbow.rotation.z = THREE.MathUtils.degToRad(pose.elbowZ);
    });

    // const chestHeight = Player.height * 0.55;
    const chestHeight = Player.height * 0.55;
    menuCamera.position.set(0, chestHeight, -1.5);
    menuCamera.lookAt(0, chestHeight, 0);

    await menuRenderer.init();
    menuRenderer.setAnimationLoop(menuRender);
};

// stops drawing and hides the menu. nothing is disposed, so showMenu can bring it back
export const hideMenu = () => {
    menuRenderer.setAnimationLoop(null);
    menuElement.hidden = true;
    menuElement.style.display = 'none';
};

// shows the menu again and restarts its drawing loop
export const showMenu = () => {
    menuElement.hidden = false;
    menuElement.style.display = '';   // back to what the stylesheet says (flex)
    menuRenderer.setAnimationLoop(menuRender);
};
