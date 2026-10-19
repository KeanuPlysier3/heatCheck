import * as THREE from 'three/webgpu';
import RAPIER from '@dimforge/rapier3d-compat';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // DEBUG ONLY, see the orbit camera block in init
import { motionDetection } from './motionDetection.js';
import { AxisGridHelper } from './classes/AxisGridHelper.js';
import { createCourt } from './objects/court';
import { createEnvironment } from './environment';
import { createPlayer, playerMaterial } from './objects/player';
import { createHoop } from './objects/hoop';
import { createBoombox } from './objects/boombox';
import { createBasketball } from './objects/basketball';
import { createCat } from './objects/cat.js';
import { createPhysics, sensorOutput } from './physics.js';
import { createMenu, hideMenu, showMenu } from './menu.js';
import { uploadScore, fetchScores } from './db.js';
import { makeClickable, setupPointer } from './helpers/pointer.js';
import { resizeRendererToDisplaySize } from './helpers/resizeRenderer.js';
import { Court } from './constants/court';
import { Boombox } from './constants/boombox';
import { Colors } from './constants/colors';
import { Player } from './constants/player';
import { Basketball } from './constants/basketball.js';
import { Meter } from './constants/meter.js';
import { Camera } from './constants/camera.js';


// GAME STATE: which mode and phase the game is in, and the settings the player can switch
let mode = 'menu';       // 'menu' or 'freePlay' or 'aroundTheWorld' or 'downtownCountdown'
let runPhase = 'idle';   // 'idle' or 'countdown' or 'playing' or 'finished'
let shotPhase = 'idle';  // 'idle' or 'aiming' or 'flying' or 'landing' or 'shrinking'
let passedTop = false;   // topSensor in rim 
let performanceMode = localStorage.getItem('performanceMode') ? localStorage.getItem('performanceMode') : 'false'; 
let freeCam = false;
let deepshotsOnly = false;
const isDev = import.meta.env.DEV; //prevent db usage in dev

const ballIsHeld = () => shotPhase === 'idle' || shotPhase === 'aiming';

let stats = {
    points: 0,
    finalTime: 0, // seconds of the last around the world run, kept for the upload
    shots: 0,
    madeShots: 0,
    shootingPercentage: 0,
    streak: 0,
    hotstreak: false,
    currentSpot: 0,
    nextSpot: 3,
    spotProgress: 0,
    AroundTheWorldShots: 0,
};


// SCENE: the renderer, the camera and every object the game updates, filled in init
let canvas;
let renderer;
let scene;
let camera;
let controls;
let basketball;
let ballMaterial;
let fire;        // the fire shader's uniforms: time and heat
let playerMesh;
let joints;      // the player's shoulder and elbow pivots
let catParts;    // the cat with setAwake and faceTowards
let boomboxMesh;
let visualiser;  // the boombox screen shader's uniforms: time and on
let colorIndex = 0;

const gui = new GUI();
gui.close();
gui.domElement.style.top = 'auto';  // out of the top right corner, where the timer is
gui.domElement.style.bottom = '2%';


// PHYSICS: the Rapier world and the fixed-step clock that drives it
let world, ballBody, ballCollider, sensors, eventQueue;
const physicsStep = 1 / 60;
let lastTime = 0;
let physicsTime = 0; // real time that has not been simulated yet


// SOUND
const track = new Audio('music/lofi.mp3');
track.volume = 0.07;

const cat = new Audio('soundEffects/cat.mp3');
cat.volume = 0.15;
cat.pause();

const swish = new Audio('soundEffects/swish1.mp3');
swish.volume = 0.7;

const greenGiant = new Audio('soundEffects/GreenGiant.mp3');
greenGiant.volume = 0.02;


// PLAYER MOVEMENT: the arm poses from the webcam or the spacebar, the jump and the player's colour
let targetPose = Player.poses.default;
const poseHold = {
    default: 300,
    loaded: 300,
    release: 300,
};
let poseUntil = 0;         // the current pose is kept until this time
let keyboardShot = false;  // true during a spacebar shot: the webcam leaves the arms and the meter alone
let jumpDelay = null;      // the jump waiting to start (a setTimeout id), or null
let jumping = false;
let jumpVelocity = 0;      // up is positive, down negative

const handlePose = (arms) => {
    if (keyboardShot) return; // the camera would pull the arms down and reset the meter
    const now = performance.now();
    const loaded = arms.every((arm) => arm?.loaded);
    const released = arms.some((arm) => arm?.released);
    const def = arms.every((arm) => arm?.default);
    const rising = arms.some((arm) => arm?.handHigh);

    if (def) {
        targetPose = Player.poses.default;
        poseUntil = now + poseHold.default;
        resetMeter();
        clearTimeout(jumpDelay); // the arms went back down before the jump started
        jumpDelay = null;
        return;
    }

    if (loaded) {
        targetPose = Player.poses.loaded;
        poseUntil = now + poseHold.loaded;
        startMeter(); // it checks by itself that a shot is possible
        return;
    }

    if (rising && targetPose === Player.poses.loaded) {
        targetPose = Player.poses.release; // start the swing early instead of waiting for a full release
        poseUntil = now + poseHold.release;

        // one jump timer at a time: this runs on every pose frame
        if (!jumping && jumpDelay === null) {
            jumpDelay = setTimeout(() => {
                jumpDelay = null;
                startJump();
            }, 100);
        }
    }

    if (released) {
        targetPose = Player.poses.release;
        poseUntil = now + poseHold.release;
        releaseMeter();
        return;
    }

    // safety net for when the arms are lost
    if (now > poseUntil + 2000) {
        targetPose = Player.poses.default;
    }
};

const lerp = (currentValue, targetValue) => currentValue + (targetValue - currentValue) * 0.2;

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

// the point in the right hand where the ball sits
const handPoint = (side) => {
    return joints[side].elbow.localToWorld(new THREE.Vector3(0.15, -Player.forearmLength, 0.15));
};

const startJump = () => { if (!jumping) { jumping = true; jumpVelocity = 0.12; } };

const updateJump = (delta) => {
    if (!jumping) return;
    const frames = delta * 60; // 1 at 60 fps, about 0.42 at 144 fps
    playerMesh.position.y += jumpVelocity * frames;
    jumpVelocity -= 0.008 * frames; // gravity
    if (playerMesh.position.y <= 0) { playerMesh.position.y = 0; jumping = false; }
};

const changePlayerColor = (step) => {
    const total = Colors.playerColors.length;
    colorIndex = (colorIndex + step + total) % total;
    playerMaterial.color.set(Colors.playerColors[colorIndex]);
};


// SHOT METER: fills while aiming, and the moment of release decides how good the shot is
let meterValue = 0; // 0 = empty, 1 = full
let meterElement, meterFill, meterGreen;

const drawGreen = (width = Meter.greenWidth) => {
    meterGreen.style.bottom = (Meter.greenCentre - width / 2) * 100 + '%';
    meterGreen.style.height = width * 100 + '%';
};

const resetMeter = () => {
    meterValue = 0;
    if (shotPhase === 'aiming') shotPhase = 'idle'; // the arms went back down: cancel the aim
};

const startMeter = () => {
    if (runPhase !== 'playing') return; // no shots in the menu, the countdown or the after game screen
    if (shotPhase !== 'idle') return;   // already filling, or the ball is not in the hand

    if (mode === "freePlay" && deepshotsOnly || mode === 'downtownCountdown' && stats.hotstreak) {
        drawGreen(0.075); // a smaller green zone for the deep shot
    } else {
        drawGreen(Meter.greenWidth);
    }
    shotPhase = 'aiming';
    meterValue = 0;
};

const showPerfect = () => {
    const perfectElement = document.getElementById('shotPerfect');
    const tilt = (3 + Math.random() * 6) * (Math.random() < 0.5 ? -1 : 1); // 3 to 9 degrees, left or right
    perfectElement.style.setProperty('--tilt', tilt + 'deg');
    perfectElement.hidden = false;
    perfectElement.style.animation = 'none'; // restart the animation, also when it is still showing
    void perfectElement.offsetWidth;
    perfectElement.style.animation = '';
};

const releaseMeter = () => {
    if (shotPhase !== 'aiming') return;

    let greenBottom, greenTop;
    if (mode === 'downtownCountdown' && stats.hotstreak) {
        greenBottom = Meter.greenCentre - .075 / 2;
        greenTop = Meter.greenCentre + .075 / 2;
    } else {
        greenBottom = Meter.greenCentre - Meter.greenWidth / 2;
        greenTop = Meter.greenCentre + Meter.greenWidth / 2;
    }

    let power = 1; // 1 = the perfect shot
    if (meterValue < greenBottom) {
        const howEarly = (greenBottom - meterValue) / greenBottom; // 0 at the green's edge, 1 at an empty meter
        power = 1 - howEarly * Meter.maxError;                     // early: short
    } else if (meterValue > greenTop) {
        const howLate = (meterValue - greenTop) / (1 - greenTop);  // 0 at the green's edge, 1 at a full meter
        power = 1 + howLate * Meter.maxError;                      // late: long
    } else {
        showPerfect();
        greenGiant.currentTime = 0;
        greenGiant.play();
    }

    shoot(power);
};

const updateMeter = (delta) => {
    if (shotPhase === 'aiming') {
        meterValue = Math.min(1, meterValue + delta / Meter.duration);
    }
    meterElement.hidden = shotPhase !== 'aiming';
    meterFill.style.height = meterValue * 100 + '%';
};


// SHOOTING AND THE BALL: the launch, made or missed, and the ball coming back to the hand
let ballScale = 1;   // 1 = full size, 0 = gone
let landingTime = 0; // seconds spent waiting for the ball to reach the floor

const shoot = (power = 1) => {
    if (!ballIsHeld()) return;
    stats.shots++;
    shotPhase = 'flying';
    passedTop = false;
    ballBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);

    const start = ballBody.translation();
    const rim = { x: 0, y: Court.Hoop.rimHeight, z: Court.Hoop.rimZ };
    const gravity = 9.81;
    const deltaTime = 1 / 60; // one physics step, needed for the perfect shot

    const distanceX = rim.x - start.x;
    const distanceY = rim.y - start.y;
    const distanceZ = rim.z - start.z;
    const horizontal = Math.hypot(distanceX, distanceZ); // flat distance from the hand to the rim

    // how steeply the ball drops into the rim
    let entryAngle;
    ballBody.setLinearDamping(Basketball.linearDamping);
    if (mode === 'downtownCountdown' && stats.hotstreak || mode === 'freePlay' && deepShotsOnly) {
        entryAngle = THREE.MathUtils.degToRad(45);
        ballBody.setLinearDamping(0);
    } else {
        entryAngle = THREE.MathUtils.degToRad(55);
    }
    const time = Math.sqrt(2 * (horizontal * Math.tan(entryAngle) + distanceY) / gravity);

    const velocityX = distanceX / time;
    const velocityZ = distanceZ / time;
    const velocityY = ((distanceY + 0.5 * gravity * time * time) / time + 0.5 * gravity * deltaTime) * power; // ½·g·t²

    ballBody.setLinvel({ x: velocityX, y: velocityY, z: velocityZ }, true);
    ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
};

// the shot is decided: updateBallReturn lets the ball land, shrinks it away and gives it back
const shotReset = (made) => {
    shotPhase = (made || ballNearFloor()) ? 'shrinking' : 'landing';
    landingTime = 0;
};

// the ball's position is its centre, one radius above the floor when it touches
const ballNearFloor = () => ballBody.translation().y <= Basketball.radius + 0.05;

// landing → shrinking → held, then it grows back in the hand
const updateBallReturn = (delta) => {
    if (shotPhase === 'landing') {
        landingTime += delta;
        if (ballNearFloor() || landingTime > Basketball.landingWait) shotPhase = 'shrinking';
    } else if (shotPhase === 'shrinking') {
        ballScale = Math.max(0, ballScale - delta / Basketball.shrinkTime);
        if (ballScale === 0) {
            shotPhase = 'idle'; // from the next frame on the ball follows the hand again
            ballBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        }
    } else if (ballScale < 1) {
        ballScale = Math.min(1, ballScale + delta / Basketball.growTime);
    }
    basketball.scale.setScalar(Math.max(ballScale, 0.001)); // a scale of exactly 0 cannot be drawn
};

const checkMadeShot = (topSensor, bottomSensor) => {
    if (topSensor) passedTop = true;

    if (bottomSensor && passedTop && shotPhase === 'flying') {
        passedTop = false;
        swish.currentTime = 0;
        swish.play();

        if (mode === 'aroundTheWorld' && runPhase === 'playing' && stats.AroundTheWorldShots < 15) {
            if (stats.AroundTheWorldShots === 14) {
                endTimer();
            }
            stats.AroundTheWorldShots++;
        }

        // points are the score, madeShots is only for the shooting percentage
        stats.madeShots++;
        stats.streak++;
        if (mode === 'downtownCountdown' && stats.hotstreak) {
            stats.points += 4; // the deep shot
        } else {
            stats.points += 2;
            stats.spotProgress++;
        }
        onMake();
        return;
    }

    const onFloor = ballBody.translation().y <= Basketball.radius + 0.02;
    if (onFloor && shotPhase === 'flying') {
        stats.streak = 0;
        onMiss();
    }
};

const onMiss = () => {
    drawGreen(Meter.greenWidth);
    if (mode === 'downtownCountdown') stats.hotstreak = false;

    if (mode !== 'freePlay' && !deepshotsOnly) {
        const spot = Court.spots[stats.currentSpot];
        playerMesh.position.set(spot.x, 0, spot.z);
        playerMesh.rotation.y = spot.facing;
        placeCamera();
    }
    stats.shootingPercentage = stats.shots > 0 ? (stats.madeShots / stats.shots) * 100 : 0;
    fire.heat.value = 0;
    ballMaterial.color.set(Colors.basketball);
    shotReset(false);
};

const onMake = () => {
    stats.shootingPercentage = stats.shots > 0 ? (stats.madeShots / stats.shots) * 100 : 0;

    if (mode === 'downtownCountdown' && stats.streak >= 5) {
        stats.hotstreak = true;
        handleSpotChange();
    }

    if (stats.spotProgress === 3 && !stats.hotstreak) {
        stats.spotProgress = 0;
        handleSpotChange();
    }

    if (stats.streak >= 3) {
        fire.heat.value = 1;
        ballMaterial.color.set(Colors.fireBasketball);
    }
    shotReset(true);
};


// SPOTS AND CAMERA: where the player stands, and the camera gliding after them
const cameraGoal = { position: new THREE.Vector3(), target: new THREE.Vector3() };

const handleSpotChange = () => {
    if (mode === "freePlay" && deepshotsOnly || mode === 'downtownCountdown' && stats.hotstreak) {
        const spot = Court.spots[5];
        playerMesh.position.set(spot.x, 0, spot.z);
        playerMesh.rotation.y = spot.facing;
        placeCamera();
    } else {
        stats.currentSpot = (stats.currentSpot + 1) % Court.rotationSpots; // 0, 1, 2, 3, 4, then 0 again
        const spot = Court.spots[stats.currentSpot];
        playerMesh.position.set(spot.x, 0, spot.z);
        playerMesh.rotation.y = spot.facing;
        placeCamera();
    }
};

const handleDeepshotsOnly = () => {
    const spot = deepshotsOnly ? Court.spots[5] : Court.spots[stats.currentSpot];
    playerMesh.position.set(spot.x, 0, spot.z);
    playerMesh.rotation.y = spot.facing;
    placeCamera();
};

const placeCamera = (menu = false) => {
    if (menu) {
        // menu view: fixed in the world
        const { position, lookAt } = Camera.menu;
        cameraGoal.position.set(position.x, position.y, position.z);
        cameraGoal.target.set(lookAt.x, lookAt.y, lookAt.z);
    } else {
        // game view: in the player's own space, so it turns with the player, looking at the rim
        playerMesh.updateMatrixWorld();
        const offset = Camera.offsets[stats.currentSpot];
        cameraGoal.position.copy(playerMesh.localToWorld(new THREE.Vector3(offset.x, offset.y, offset.z)));
        cameraGoal.target.set(0, Court.Hoop.rimHeight, Court.Hoop.rimZ);
    }
};

const smoothCamera = (delta) => {
    const t = 1 - Math.exp(-3 * delta); // 3 = speed. the exp makes it independent of the frame rate
    camera.position.lerp(cameraGoal.position, t);
    controls.target.lerp(cameraGoal.target, t);
};


// INTERACTIVE OBJECTS: the boombox and the cat react to clicks and to their sound
const toggleBoombox = () => {
    track.paused ? track.play() : track.pause();
};

// the cat stands while its sound plays, and curls up again when it stops
const toggleCat = () => {
    if (cat.paused) {
        cat.play();
        catParts.setAwake(true);
    } else {
        cat.pause();
        catParts.setAwake(false);
    }
};
cat.addEventListener('ended', () => catParts.setAwake(false));

const updateBoombox = (time) => {
    const playing = !track.paused && !track.muted;
    const large = playing && Math.floor(time / Boombox.bumpInterval) % 2 === 1; // small, large, small, large...
    const up = large ? Boombox.bumpUp : 0;
    const side = large ? Boombox.bumpSide : 0;
    boomboxMesh.scale.set(1 + side, 1 + up, 1 + side);

    visualiser.time.value = time;
    visualiser.on.value = playing ? 1 : 0;
};


// GAME MODES: starting a mode, the 3-2-1 countdown, and going back to the menu
const goToMenu = () => {
    document.getElementById('leaderboard').hidden = true;
    // stop every timer that could still change the game after leaving it
    clearInterval(timeInterval);    // the run's stopwatch or 60 second countdown
    clearTimeout(countdownTimeout); // the 3-2-1: its promise never resolves now, so the run never starts
    clearTimeout(jumpDelay);
    jumpDelay = null;
    stopWatch = 0;
    document.getElementById('countdown').hidden = true;
    document.getElementById('afterGame').hidden = true;
    document.getElementById('timer').hidden = true;
    document.querySelector('#deepShotsOnly').hidden = true;
    mode = 'menu';
    runPhase = 'idle';
    placeCamera(true);
    showMenu();
};

const handleFreeplayClick = () => {
    document.getElementById('leaderboard').hidden = true; // free play has no scores
    document.querySelector('#deepShotsOnly').hidden = false;
    mode = 'freePlay';
    runPhase = 'playing'; // no countdown
    document.getElementById('timer').hidden = true;
    hideMenu();
    placeCamera();
};

const handleAroundTheWorldClick = () => {
    showLeaderboard('aroundTheWorld');
    document.querySelector('#deepShotsOnly').hidden = true;
    hideMenu();
    placeCamera();
    startAroundTheWorld();
};

const handleDowntownCountdownClick = () => {
    showLeaderboard('downtownCountdown');
    document.querySelector('#deepShotsOnly').hidden = true;
    hideMenu();
    placeCamera();
    startDowntownCountdown();
};

const startDowntownCountdown = async () => {
    mode = 'downtownCountdown';
    runPhase = 'countdown';
    await showCountDown(3);
    runPhase = 'playing';
    document.getElementById('timer').hidden = false;
    startCountdownTimer(60);
    stats.AroundTheWorldShots = 0;
    stats.spotProgress = 0;
    stats.nextSpot = 0;
    stats.streak = 0;
    stats.shots = 0;
    stats.madeShots = 0;
    stats.points = 0;
    stats.shootingPercentage = 0;
};

const startAroundTheWorld = async () => {
    mode = 'aroundTheWorld';
    runPhase = 'countdown';
    await showCountDown(3);
    runPhase = 'playing';
    document.getElementById('timer').hidden = false;

    startTimer();
    document.getElementById('timerValue').textContent = '00:00';

    stats.AroundTheWorldShots = 0;
    stats.spotProgress = 0;
    stats.currentSpot = 0;
    stats.nextSpot = 0;
    stats.streak = 0;
    stats.shots = 0;
    stats.madeShots = 0;
    stats.points = 0;
    stats.shootingPercentage = 0;

    updateStatsDisplay();
};

const showCountDown = async (seconds) => {
    const countdownElement = document.querySelector('#countdown');
    const nextNumber = seconds - 1;
    countdownElement.textContent = seconds;
    countdownElement.hidden = false;
    // restart the pop-in animation for every number (new text alone does not restart a css animation)
    countdownElement.style.animation = 'none';
    void countdownElement.offsetWidth;
    countdownElement.style.animation = '';

    // the timeout's id is kept in countdownTimeout, so goToMenu can cancel the countdown
    if (nextNumber > 0) {
        await new Promise(resolve => countdownTimeout = setTimeout(resolve, 1000));
        await showCountDown(nextNumber);
    } else {
        await new Promise(resolve => countdownTimeout = setTimeout(resolve, 1000));
        countdownElement.hidden = true;
    }
};


// TIMERS: the around the world stopwatch and the downtown countdown, and what happens when they end
let stopWatch = 0;     // seconds in the current run
let timeInterval;      // the running setInterval
let countdownTimeout;  // the 3-2-1's current setTimeout

const startTimer = () => {
    stats.AroundTheWorldShots = 0;
    timeInterval = setInterval(() => {
        stopWatch++;
        const minutes = Math.floor(stopWatch / 60);
        const seconds = stopWatch % 60;
        document.getElementById('timerValue').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
};

const endTimer = () => {
    clearInterval(timeInterval);
    const currentTime = stopWatch;
    stats.finalTime = currentTime; // kept for the upload, stopWatch is reset next
    stopWatch = 0;
    runPhase = 'finished';

    resetUploadButton();
    loadLeaderboard(mode); // not awaited: the screen shows at once, the list fills in later
    document.getElementById('afterGame').hidden = false;
    document.getElementById('retry').hidden = false;
    document.getElementById('retry2').hidden = true;
    document.getElementById('yourTime').textContent = `Your Time: ${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`;
};

const startCountdownTimer = (timeLimit) => {
    stats.AroundTheWorldShots = 0;
    stopWatch = timeLimit;
    timeInterval = setInterval(() => {
        stopWatch = Math.max(0, stopWatch - 1);
        if (stopWatch === 0) {
            endCountdownTimer();
        }
        document.getElementById('timerValue').textContent = `${stopWatch.toString()}s`;
    }, 1000);
};

const endCountdownTimer = () => {
    clearInterval(timeInterval);
    stopWatch = 0;
    runPhase = 'finished';

    resetUploadButton();
    loadLeaderboard(mode);
    document.getElementById('retry').hidden = true;
    document.getElementById('retry2').hidden = false;
    document.getElementById('afterGame').hidden = false;
    document.getElementById('yourTime').textContent = `Your score: ${stats.points} (${stats.shootingPercentage.toFixed(2)}%)`;
};


// STATS DISPLAY
const updateStatsDisplay = () => {
    document.querySelector('#shots').textContent = stats.shots;
    document.querySelector('#points').textContent = stats.points;
    document.querySelector('#madeShots').textContent = stats.madeShots;
    document.querySelector('#shootingPercentage').textContent = stats.shootingPercentage.toFixed(2) + '%';
};


// LEADERBOARD: the online top 10 and uploading a round
// seconds as m:ss, for the around the world times
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

const showLeaderboard = (leaderboardMode) => {
    if (isDev) return;
    document.getElementById('leaderboard').hidden = false;
    loadLeaderboard(leaderboardMode); // not awaited: the run starts at once
};

const loadLeaderboard = async (leaderboardMode) => {
    if (isDev) return;
    const list = document.getElementById('leaderboard__list');
    const status = document.getElementById('leaderboard__status');
    const isTime = leaderboardMode === 'aroundTheWorld';

    document.getElementById('leaderboard__title').textContent = isTime ? 'Fastest times' : 'Top scores';
    document.getElementById('leaderboard__unit').textContent = isTime ? 'time' : 'points';
    status.textContent = 'Loading…';
    status.hidden = false;

    try {
        const { scores } = await fetchScores(leaderboardMode);
        list.replaceChildren();
        scores.forEach((row) => {
            const item = document.createElement('li');
            const name = document.createElement('span');
            const score = document.createElement('span');
            name.className = 'leaderboard__name';
            name.textContent = row.name;
            score.textContent = isTime ? formatTime(Number(row.score)) : row.score;
            item.append(name, score);
            list.append(item);
        });

        status.textContent = 'No scores yet, be the first!';
        status.hidden = scores.length > 0;
    } catch (error) {
        list.replaceChildren();
        status.textContent = 'Leaderboard unavailable';
    }
};

const resetUploadButton = () => {
    const uploadBtn = document.querySelector('#uploadScoreBtn');
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload score';
};

const setData = () => {
    const formData = new FormData(document.querySelector('#afterGame__form'));
    const name = localStorage.getItem('username') ? localStorage.getItem('username').trim() : 'anonymous';
    formData.set('name', name);
    formData.set('mode', mode); // 'downtownCountdown' or 'aroundTheWorld', what scores.php checks against
    formData.set('score', mode === 'downtownCountdown' ? stats.points : stats.finalTime);
    return formData;
};


// EVENTS: every button and key listener, set up once (calling it twice would double every click)
// a description that follows the mouse over its button
const addDescription = (button, description) => {
    button.addEventListener('mouseover', () => description.classList.add('visible'));
    button.addEventListener('mousemove', (event) => {
        description.style.left = `${event.clientX}px`;
        description.style.top = `${event.clientY}px`;
    });
    button.addEventListener('mouseleave', () => description.classList.remove('visible'));
};

const setEvents = () => {
    // menu
    if (performanceMode === 'true') {
        document.querySelector('#performanceModeCheckbox').checked = true;
    }

    document.querySelector('#colorPrev').addEventListener('click', () => changePlayerColor(-1));
    document.querySelector('#colorNext').addEventListener('click', () => changePlayerColor(1));

    const usernameInput = document.querySelector('#usernameInput');
    usernameInput.addEventListener('input', () => {
        localStorage.setItem('username', usernameInput.value.trim());
    });

    const freePlayBtn = document.querySelector('#freePlayBtn');
    const aroundTheWorldBtn = document.querySelector('#aroundTheWorldBtn');
    const downtownCountdownBtn = document.querySelector('#downTownCountdownBtn');
    freePlayBtn.addEventListener('click', handleFreeplayClick);
    aroundTheWorldBtn.addEventListener('click', handleAroundTheWorldClick);
    downtownCountdownBtn.addEventListener('click', handleDowntownCountdownClick);
    addDescription(freePlayBtn, document.querySelector('#freePlayDescription'));
    addDescription(aroundTheWorldBtn, document.querySelector('#aroundTheWorldDescription'));
    addDescription(downtownCountdownBtn, document.querySelector('#downTownCountdownDescription'));

    document.querySelector('#performanceModeCheckbox').addEventListener('change', (event) => {
        performanceMode = event.target.checked ? 'true' : 'false'; // kept as a string, like localStorage
        localStorage.setItem('performanceMode', performanceMode);
        window.location.reload(); // the environment is only built when the page loads
    });

    // in game
    document.querySelector('#freeCam').addEventListener('change', (event) => {
        event.target.blur();
        freeCam = !freeCam;
    });

    document.querySelector('#deepShotOnlyCheckbox').addEventListener('change', (event) => {
        event.target.blur();
        deepshotsOnly = event.target.checked;
        handleDeepshotsOnly();
    });

    document.getElementById('menuBtn').addEventListener('click', goToMenu);

    const explanation = document.getElementById('explanation');
    document.getElementById('helpBtn').addEventListener('click', () => {
        explanation.hidden = false;
        document.getElementById('explanationContinue').focus(); // Enter or Space closes it straight away
    });
    document.getElementById('explanationContinue').addEventListener('click', () => {
        explanation.hidden = true;
    });

    document.getElementById('shotPerfect').addEventListener('animationend', (event) => {
        event.target.hidden = true;
    });

    // after game screen
    document.getElementById('homeBtn').addEventListener('click', goToMenu);

    document.getElementById('retry').addEventListener('click', () => {
        document.getElementById('afterGame').hidden = true;
        startAroundTheWorld();
    });

    document.getElementById('retry2').addEventListener('click', () => {
        document.getElementById('afterGame').hidden = true;
        startDowntownCountdown();
    });

    const uploadBtn = document.querySelector('#uploadScoreBtn');
    uploadBtn.hidden = isDev;
    uploadBtn.addEventListener('click', async () => {
        if (isDev) return;
        uploadBtn.disabled = true; // no second click while sending
        uploadBtn.textContent = 'Sending…';
        try {
            await uploadScore(setData());
            uploadBtn.textContent = 'Uploaded!'; // stays disabled: this round is in
            loadLeaderboard(mode); // so the new score shows up
        } catch (error) {
            uploadBtn.textContent = 'Failed, retry';
            uploadBtn.disabled = false;
        }
    });

    // spacebar shot: hold to fill the meter, let go to shoot. the arms follow with the webcam's poses
    window.addEventListener('keydown', (event) => {
        if (event.code !== 'Space' || event.repeat) return;
        startMeter();
        if (shotPhase !== 'aiming') return; // no shot started (menu, countdown, ball still flying)
        keyboardShot = true;
        targetPose = Player.poses.loaded;
    });
    window.addEventListener('keyup', (event) => {
        if (event.code !== 'Space') return;
        const wasAiming = shotPhase === 'aiming'; // before releaseMeter, which changes the phase
        releaseMeter();
        if (!wasAiming) {
            keyboardShot = false; // the shot was cancelled while space was held
            return;
        }
        targetPose = Player.poses.release;
        startJump();
        setTimeout(() => {
            targetPose = Player.poses.default;
            keyboardShot = false; // the webcam may move the arms again
        }, poseHold.release);
    });
};


// SETUP: the renderer, the lights, every object in the scene, the camera and the debug helpers
const makeAxisGrid = (node, label, units) => {
    const helper = new AxisGridHelper(node, units);
    gui.add(helper, 'visible').name(label);
};

const init = async () => {
    document.querySelector('#usernameInput').value = localStorage.getItem('username') || '';

    meterElement = document.querySelector('#meter');
    meterGreen = document.querySelector('#meterGreen');
    meterFill = document.querySelector('#meterFill');
    drawGreen(Meter.greenWidth);

    canvas = document.querySelector('#c');
    renderer = new THREE.WebGPURenderer({
        canvas,
        alpha: true,
        antialias: true
    });
    renderer.shadowMap.enabled = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(Colors.background);

    // light, with a shadow map covering the court
    const light = new THREE.DirectionalLight(0xffffff, 15);
    light.position.set(10, 20, 20);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    const d = 10;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.bias = 0.001; // against shadow acne (the court shadowing itself)
    scene.add(light);

    // objects
    const hoop = createHoop();
    scene.add(hoop);
    makeAxisGrid(hoop, 'hoop', 15);

    const court = createCourt();
    scene.add(court);
    makeAxisGrid(court, 'court', 15);

    const boomboxParts = createBoombox();
    visualiser = boomboxParts.visualiser;
    boomboxMesh = boomboxParts.boombox;
    makeClickable(boomboxParts.boombox, toggleBoombox);
    scene.add(boomboxParts.boombox);

    if (performanceMode === 'false') {
        scene.add(createEnvironment());
    }

    const player = createPlayer();
    playerMesh = player.player;
    joints = player.joints;
    scene.add(player.player);
    makeAxisGrid(player.player, 'player', 1);

    catParts = createCat();
    scene.add(catParts.cat);
    makeClickable(catParts.cat, toggleCat);

    ({ basketball, ballMaterial, fire } = createBasketball());
    scene.add(basketball);
    makeAxisGrid(basketball, 'basketball', 1);

    ({ world, ballBody, ballCollider, sensors, eventQueue } = createPhysics());

    // camera
    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 100;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // start in the menu pose, so the first frame does not swoop in from the origin
    camera.position.set(Camera.menu.position.x, Camera.menu.position.y, Camera.menu.position.z);
    controls.target.set(Camera.menu.lookAt.x, Camera.menu.lookAt.y, Camera.menu.lookAt.z);
    placeCamera(true);
    gui.add(controls, 'enabled').name('orbit camera (debug)');

    setupPointer(canvas, camera);
    setEvents();
};


// RENDER LOOP: one frame of physics, animation and drawing
const render = (time) => {
    time *= 0.001; // seconds
    const delta = Math.min(time - lastTime, 0.1); // capped, so a hidden tab does not make a huge jump
    lastTime = time;

    // physics: the held ball follows the hand, then the world steps in fixed steps
    physicsTime += delta;
    if (ballIsHeld()) {
        ballBody.setNextKinematicTranslation(handPoint('right'));
    }
    while (physicsTime >= physicsStep) {
        world.step(eventQueue);
        physicsTime -= physicsStep;
    }

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    if (!freeCam) {
        smoothCamera(delta);
    }
    controls.update(); // DEBUG ONLY: the orbit camera's damping

    updateArms();
    catParts.faceTowards(playerMesh.position.x, playerMesh.position.z);
    updateJump(delta);
    updateBallReturn(delta);
    updateBoombox(time);

    const p = ballBody.translation();
    basketball.position.set(p.x, p.y, p.z);

    const { topSensor, bottomSensor } = sensorOutput(world, ballCollider, sensors, eventQueue);
    checkMadeShot(topSensor, bottomSensor);
    fire.time.value = time;

    updateMeter(delta);
    updateStatsDisplay();

    renderer.render(scene, camera);
};


// START: the webcam, the music and the menu, then the game itself
await motionDetection(handlePose);
document.getElementById('loading__container').style.visibility = 'hidden';
track.play();

await createMenu();

init();
await renderer.init();
renderer.setAnimationLoop(render);
