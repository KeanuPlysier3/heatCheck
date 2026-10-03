import * as THREE from 'three/webgpu';
import { AxisGridHelper } from './classes/AxisGridHelper.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // DEBUG ONLY, see the orbit camera block in init
import { createCourt } from './objects/court';
import { createHoop } from './objects/hoop';

let canvas;
let renderer;
let scene;
let camera;
let controls; // DEBUG ONLY: the orbit camera
const gui = new GUI();

const init = async () => {

    canvas = document.querySelector('#c');
    renderer = new THREE.WebGPURenderer({
        canvas,
        alpha: true,
        antialias: true
    });

    renderer.shadowMap.enabled = true; // enable shadow maps


    const fov = 75;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 9, -7); 
  
    camera.lookAt(0, 0, 0);

    // ---------------------------------------------------------------------------------------------
    // DEBUG ONLY: orbit camera
    // lets me fly around the scene with the mouse to check where objects are positioned.
    // left-drag = orbit, right-drag = pan, scroll = zoom.
    // this is NOT part of the game: the real game gets a fixed camera behind the shooter.
    // to remove it: delete this block, the import, the `controls` variable and controls.update() in render.
    // ---------------------------------------------------------------------------------------------
    controls = new OrbitControls(camera, renderer.domElement); // moves `camera`, listens for mouse input on the canvas
    controls.enableDamping = true; // the movement glides to a stop instead of stopping dead
    controls.dampingFactor = 0.05;//glide 
    controls.target.set(0, 0, 0); // the point the camera orbits around and keeps looking at
    gui.add(controls, 'enabled').name('orbit camera (debug)'); // checkbox to switch the mouse control off

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8080);


    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 20, 20);
    scene.add(light);
    light.castShadow = true; // enable shadows for this light
    light.shadow.mapSize.width = 2048; // increase the shadow map resolution for better quality
    light.shadow.mapSize.height = 2048;

    // the camera is needed to create the shadow map, 
    const d = 10;
    light.shadow.camera.left = -d; // set the size of the shadow camera to cover the area where shadows are needed
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;

    // set the near and far planes of the shadow camera to cover the area where shadows are needed
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;

    // set the bias to reduce shadow acne (self-shadowing artifacts), an error margin to keep our court lit.
    light.shadow.bias = 0.001;



    const hoop = createHoop();
    scene.add(hoop);
    makeAxisGrid(hoop, 'hoop', 15);

    const court = createCourt();
    scene.add(court);
    makeAxisGrid(court, 'court', 15);


}


function resizeRendererToDisplaySize(renderer) {
    const pixelRatio = window.devicePixelRatio;
    const width = Math.floor(canvas.clientWidth * pixelRatio);
    const height = Math.floor(canvas.clientHeight * pixelRatio);
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

function makeAxisGrid(node, label, units) {
    const helper = new AxisGridHelper(node, units);
    gui.add(helper, 'visible').name(label); // a checkbox bound to helper.visible, shown with this label
}


const render = (time) => {
    time *= 0.001;  // convert time to seconds

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    controls.update(); // DEBUG ONLY: needed every frame for the orbit camera's damping

    renderer.render(scene, camera);
}


init();
await renderer.init(); //initialize the renderer and wait for it to be ready
renderer.setAnimationLoop(render); //loop the animation loop and call the render function for each frame