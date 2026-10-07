import * as THREE from 'three/webgpu';
import { motionDetection } from './motionDetection.js';
import { AxisGridHelper } from './classes/AxisGridHelper.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // DEBUG ONLY, see the orbit camera block in init
import { createCourt } from './objects/court';
import { createPlayer } from './objects/player';
import { createHoop } from './objects/hoop';
import { Colors } from './constants/colors';
import { Player } from './constants/player';
import { createBasketball } from './objects/basketball';

let canvas;
let renderer;
let scene;
let camera;
let basketball; // the basketball mesh, used to update its position every frame
let controls; // DEBUG ONLY: the orbit camera
let joints; // the player's shoulder and elbow pivots, filled in init
let playerMesh; // the player's y position, used for jumping


const gui = new GUI();

let jumping = false
let jumpVelocity = 0;

let targetPose = Player.poses.default;

const updateArms = () => {
    const toRadians = THREE.MathUtils.degToRad;
    ['left', 'right'].forEach((side) => {
        const { shoulder, elbow } = joints[side];
        const t = targetPose[side];
        shoulder.rotation.x = lerp(shoulder.rotation.x, toRadians(t.shoulderX));
        shoulder.rotation.z = lerp(shoulder.rotation.z, toRadians(t.shoulderZ));
        elbow.rotation.x = lerp(elbow.rotation.x, toRadians(t.elbowX));
        elbow.rotation.z = lerp(elbow.rotation.z, toRadians(t.elbowZ));
    });
};



const startJump = () => { if (!jumping) { jumping = true; jumpVelocity = 0.12; } };
const updateJump = () => {
    if (!jumping) return;
    playerMesh.position.y += jumpVelocity;
    jumpVelocity -= 0.008;               // gravity
    if (playerMesh.position.y <= 0) { playerMesh.position.y = 0; jumping = false; }
};


const lerp = (currentValue, targetValue) => {
    currentValue += (targetValue - currentValue) * 0.2;
    return currentValue;
}

const poseHold = {
    default: 300,
    loaded: 300,
    release: 300,
};
let poseUntil = 0; // the current pose is kept until this time

const handlePose = (arms) => {
    const now = performance.now();
    const loaded = arms.every((arm) => arm?.loaded);
    const released = arms.some((arm) => arm?.released);
    const def = arms.every((arm) => arm?.default);
    const rising = arms.some((arm) => arm?.handHigh);


    if (def) {
        targetPose = Player.poses.default;
        poseUntil = now + poseHold.default;
        return;
    }

    if (loaded) {
        targetPose = Player.poses.loaded;
        poseUntil = now + poseHold.loaded;      // restart the clock on every loaded frame
        return;
    }

    if (rising && targetPose === Player.poses.loaded) {
        targetPose = Player.poses.release;   // start the swing early instead of waiting for a full release
        poseUntil = now + poseHold.release;
        startJump(); // jump when the arms are rising
        return;
    }

    if (released) {
        targetPose = Player.poses.release;
        poseUntil = now + poseHold.release;
        return;
    }

    //safety net for when arms are lost
    if (now > poseUntil + 2000) {
        targetPose = Player.poses.default;
    }
};

const handPoint = (side) => {
    return joints[side].elbow.localToWorld(new THREE.Vector3(0.15, -Player.forearmLength, 0.15));
};

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

    // DEBUG ONLY: orbit camera

    controls = new OrbitControls(camera, renderer.domElement); // moves `camera`, listens for mouse input on the canvas
    controls.enableDamping = true; // the movement glides to a stop instead of stopping dead
    controls.dampingFactor = 0.05;//glide 
    controls.target.set(0, 0, 0); // the point the camera orbits around and keeps looking at
    gui.add(controls, 'enabled').name('orbit camera (debug)'); // checkbox to switch the mouse control off

    scene = new THREE.Scene();
    scene.background = new THREE.Color(Colors.background);


    const light = new THREE.DirectionalLight(0xffffff, 14);
    light.position.set(10, 20, 20);
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


    const player = createPlayer();
    playerMesh = player.player; // the player's y position, used for jumping
    joints = player.joints;
    scene.add(player.player);
    makeAxisGrid(player.player, 'player', 1);

    basketball = createBasketball();
    scene.add(basketball);
    makeAxisGrid(basketball, 'basketball', 1);


    motionDetection(handlePose); // start the motion detection and shot counting, handlePose gets the arms every frame


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
    updateArms(); // update the player's arm rotations based on the target pose
    basketball.position.copy(handPoint('right'));
    updateJump(); // update the player's jump position based on the jump velocity    
}


init();
await renderer.init(); //initialize the renderer and wait for it to be ready
renderer.setAnimationLoop(render); //loop the animation loop and call the render function for each frame