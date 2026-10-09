import * as THREE from 'three/webgpu';
import RAPIER from '@dimforge/rapier3d-compat';
import { motionDetection } from './motionDetection.js';
import { AxisGridHelper } from './classes/AxisGridHelper.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // DEBUG ONLY, see the orbit camera block in init
import { createCourt } from './objects/court';
import { createPlayer } from './objects/player';
import { Court } from './constants/court';
import { createHoop } from './objects/hoop';
import { Colors } from './constants/colors';
import { Player } from './constants/player';
import { createBasketball } from './objects/basketball';
import { Basketball } from './constants/basketball.js';
import { createPhysics } from './physics.js';
import { sensorOutput } from './physics.js';
import { Meter } from './constants/meter.js';
import { math } from '@tensorflow/tfjs-core';

let canvas;
let renderer;
let scene;
let camera;
let basketball; // the basketball mesh, used to update its position every frame
let ballMaterial
let fire; // the basketball's fire shader uniforms, used to update the flame every frame
let controls;
let joints; // the player's shoulder and elbow pivots, filled in init
let playerMesh; // the player's y position, used for jumping
let world, ballBody, ballCollider, sensors, eventQueue; // physics world, filled in init
const physicsStep = 1 / 60;   // seconds per physics step
let lastTime = 0;
let physicsTime = 0;    // real time that hasn't been simulated yet

let meterValue = 0;       // 0 = empty, 1 = full
let meterActive = false;  // true while a shot is being loaded
let meterElement, meterFill, meterGreen; // the bar's elements, filled in init

let passedTop = false; // whether the ball has passed the top sensor
let shotInProgress = false; // whether a shot is in progress, used to prevent multiple makes from one shot

let shotArmed = false; // whether the shot is armed and ready to be taken

let stats = {
    shots: 0,
    madeShots: 0,
    shootingPercentage: 0,
    streak: 0,
};

const swish = new Audio('soundEffects/swish1.mp3');
swish.volume = 0.7; // set the volume to 70% of the original




let ballState = "held"; // held: in the hand. flying: a shot in the air. landing: shot decided, waiting for the floor. shrinking: on its way back
let ballScale = 1;      // the ball's size on screen: 1 = full size, 0 = gone
let landingTime = 0;    // seconds spent waiting for the ball to reach the floor

const gui = new GUI();

let jumping = false
let jumpVelocity = 0;

let targetPose = Player.poses.default;

//MOVEMENT FUNCTIONS
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
        resetMeter(); // reset the meter when the arms are back to default

        return;
    }

    if (loaded) {
        targetPose = Player.poses.loaded;
        poseUntil = now + poseHold.loaded;      // restart the clock on every loaded frame
        shotArmed = true; // the shot is armed and ready to be taken
        if (!shotInProgress) startMeter(); // start the meter when the arms are loaded
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
        if (shotArmed) {
            shotArmed = false;
            releaseMeter(); // take the shot when the arms are released
        }
        return;
    }

    //safety net for when arms are lost
    if (now > poseUntil + 2000) {
        targetPose = Player.poses.default;
    }
};

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

const lerp = (currentValue, targetValue) => {
    currentValue += (targetValue - currentValue) * 0.2;
    return currentValue;
}

const handPoint = (side) => {
    return joints[side].elbow.localToWorld(new THREE.Vector3(0.15, -Player.forearmLength, 0.15));
};



const startJump = () => { if (!jumping) { jumping = true; jumpVelocity = 0.12; } };

const updateJump = (delta) => {
    if (!jumping) return;
    const frames = delta * 60;                 // 1 at 60 fps, about 0.42 at 144 fps
    playerMesh.position.y += jumpVelocity * frames;
    jumpVelocity -= 0.008 * frames;             // gravity
    if (playerMesh.position.y <= 0) { playerMesh.position.y = 0; jumping = false; }
};


const resetMeter = () => {
    meterValue = 0;
    meterActive = false;
};

const startMeter = () => {
    if (meterActive) return;   // already filling
    meterActive = true;
    meterValue = 0;
};

const releaseMeter = () => {
    if (!meterActive) return;  // nothing to release
    meterActive = false;
    console.log('released at', meterValue.toFixed(2));

    const greenBottom = Meter.greenCentre - Meter.greenWidth / 2;
    const greenTop = Meter.greenCentre + Meter.greenWidth / 2;

    let power = 1;                                                         // 1 = the perfect shot
    if (meterValue < greenBottom) {
        const howEarly = (greenBottom - meterValue) / greenBottom;         // 0 at the green's edge, 1 at an empty meter
        power = 1 - howEarly * Meter.maxError;                             // early: less power, short
    } else if (meterValue > greenTop) {
        const howLate = (meterValue - greenTop) / (1 - greenTop);          // 0 at the green's edge, 1 at a full meter
        power = 1 + howLate * Meter.maxError;                              // late: more power, long
    } else {
        console.log('Perfect shot!');
    }

    shoot(power);

};

const updateMeter = (delta) => {
    if (meterActive) {
        meterValue = Math.min(1, meterValue + delta / Meter.duration);   // stops at the top
    }
    meterElement.hidden = !meterActive;
    meterFill.style.height = meterValue * 100 + '%';
};


const shoot = (power = 1) => {
    if (ballState !== 'held') return; //avoid shooting if the ball is already flying
    stats.shots++;
    ballState = "flying";
    shotInProgress = true;
    passedTop = false;
    ballBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true); // make the ball dynamic so it can be affected by physics


    const start = ballBody.translation();
    const rim = { x: 0, y: Court.Hoop.rimHeight, z: Court.Hoop.rimZ };
    const gravity = 9.81;
    const deltaTime = 1 / 60; // 60fps, the time between frames -> needed for perfect shot.


    const distanceX = rim.x - start.x;
    const distanceY = rim.y - start.y;
    const distanceZ = rim.z - start.z;

    const horizontal = Math.hypot(distanceX, distanceZ);   // flat distance from the hand to the rim
    const entryAngle = THREE.MathUtils.degToRad(55);       // how steeply the ball drops into the rim
    const time = Math.sqrt(2 * (horizontal * Math.tan(entryAngle) + distanceY) / gravity);

    const velocityX = distanceX / time;
    const velocityZ = distanceZ / time;

    const velocityY = ((distanceY + 0.5 * gravity * time * time) / time + 0.5 * gravity * deltaTime) * power; //formula for vertical motion under gravity ½.g.t²

    ballBody.setLinvel({ x: velocityX, y: velocityY, z: velocityZ }, true); //linear velocity
    ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true)// angular velocity (backspin)
}

// the shot is decided: let the ball land, shrink it away, and give it back to the player.
// this only starts the sequence, updateBallReturn does the work frame by frame
const shotReset = () => {
    ballState = ballNearFloor() ? "shrinking" : "landing";
    landingTime = 0;
};

// true when the ball is on the floor or within a few centimetres of it.
// the ball's position is its centre, which is one radius above the floor when it touches
const ballNearFloor = () => ballBody.translation().y <= Basketball.radius + 0.05;

// runs every frame: moves the ball through landing → shrinking → held, and grows it back in the hand
const updateBallReturn = (delta) => {
    if (ballState === "landing") {
        // the ball keeps bouncing as a normal physics ball until it touches the floor
        landingTime += delta;
        if (ballNearFloor() || landingTime > Basketball.landingWait) ballState = "shrinking";
    } else if (ballState === "shrinking") {
        ballScale = Math.max(0, ballScale - delta / Basketball.shrinkTime); // from 1 to 0 in shrinkTime seconds
        if (ballScale === 0) {
            ballState = "held"; // from the next frame on the ball follows the hand again
            ballBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        }
    } else if (ballState === "held" && ballScale < 1) {
        ballScale = Math.min(1, ballScale + delta / Basketball.growTime); // grow back in the hand
    } 
    //scale whole group.
    basketball.scale.setScalar(Math.max(ballScale, 0.001)); // never exactly 0, a scale of 0 cannot be drawn
};

const checkMadeShot = (topSensor, bottomSensor) => {
    if (topSensor) passedTop = true;

    if (bottomSensor && passedTop && shotInProgress) {
        passedTop = false;
        swish.currentTime = 0;
        swish.play();
        shotInProgress = false;
        stats.madeShots++;

        stats.streak++;
        onMake();
        return
    }


    const onFloor = ballBody.translation().y <= Basketball.radius + 0.02;
    if (onFloor && shotInProgress) {
        shotInProgress = false;
        stats.streak = 0;
        onMiss();
    }
};

const onMiss = () => {
    stats.shootingPercentage = stats.shots > 0 ? (stats.madeShots / stats.shots) * 100 : 0;
    fire.heat.value = 0;
    ballMaterial.color.set(Colors.basketball);
    console.log('missed shot');
    shotReset();
}


const onMake = () => {
    stats.shootingPercentage = stats.shots > 0 ? (stats.madeShots / stats.shots) * 100 : 0;
    const p = ballBody.translation();
    const onFloor = p.y <= Basketball.radius + 0.02;
    if (stats.streak >= 3) {
        fire.heat.value = 1;
        ballMaterial.color.set(Colors.fireBasketball);
    }
    shotReset();
}


//STATS DISPLAY
const updateStatsDisplay = () => {
    const shotsElement = document.querySelector('#shots');
    const madeShotsElement = document.querySelector('#madeShots');
    const shootingPercentageElement = document.querySelector('#shootingPercentage');

    shotsElement.textContent = stats.shots;
    madeShotsElement.textContent = stats.madeShots;
    shootingPercentageElement.textContent = stats.shootingPercentage.toFixed(2) + '%';
};

//SETUP
const init = async () => {

    meterElement = document.querySelector('#meter');
    meterGreen = document.querySelector('#meterGreen');
    meterFill = document.querySelector('#meterFill');

    meterGreen.style.bottom = (Meter.greenCentre - Meter.greenWidth / 2) * 100 + '%';
    meterGreen.style.height = Meter.greenWidth * 100 + '%';

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

    ({ basketball, ballMaterial, fire } = createBasketball());
    scene.add(basketball);
    makeAxisGrid(basketball, 'basketball', 1);

    ({ world, ballBody, ballCollider, sensors, eventQueue } = createPhysics());


    motionDetection(handlePose); // start the motion detection and shot counting, handlePose gets the arms every frame

    window.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && !event.repeat) startMeter();
    });
    window.addEventListener('keyup', (event) => {
        if (event.code === 'Space') releaseMeter();
    });



}


//HELPERS AND DEBUG
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


//RENDER LOOP
const render = (time) => {
    time *= 0.001; //time in seconds
    const delta = Math.min(time - lastTime, 0.1);   // seconds since the last frame, capped
    lastTime = time;

    physicsTime += delta;

    if (ballState === 'held') {
        const h = handPoint('right');
        ballBody.setNextKinematicTranslation(h);           // physics follows the hand
    }

    while (physicsTime >= physicsStep) {
        world.step(eventQueue);
        physicsTime -= physicsStep;// simulate the world in fixed-size steps, so the simulation is stable and deterministic

    }

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    controls.update(); // DEBUG ONLY: needed every frame for the orbit camera's damping


    updateArms(); // update the player's arm rotations based on the target pose


    updateJump(delta);
    updateBallReturn(delta); // landing, shrinking and growing back of the ball after a shot


    const p = ballBody.translation();
    basketball.position.set(p.x, p.y, p.z);

    const { topSensor, bottomSensor } = sensorOutput(world, ballCollider, sensors, eventQueue);

    checkMadeShot(topSensor, bottomSensor);
    fire.time.value = time;


    updateMeter(delta);
    updateStatsDisplay();
    renderer.render(scene, camera);
}


init();
await renderer.init(); //initialize the renderer and wait for it to be ready
renderer.setAnimationLoop(render); //loop the animation loop and call the render function for each frame