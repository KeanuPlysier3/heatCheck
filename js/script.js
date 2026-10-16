import * as THREE from 'three/webgpu';
import RAPIER from '@dimforge/rapier3d-compat';
import { motionDetection } from './motionDetection.js';
import { AxisGridHelper } from './classes/AxisGridHelper.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // DEBUG ONLY, see the orbit camera block in init
import { createCourt } from './objects/court';
import { createEnvironment } from './environment';
import { createPlayer, playerMaterial } from './objects/player';
import { Court } from './constants/court';
import { createHoop } from './objects/hoop';
import { Colors } from './constants/colors';
import { Player } from './constants/player';
import { createBasketball } from './objects/basketball';
import { Basketball } from './constants/basketball.js';
import { createPhysics } from './physics.js';
import { sensorOutput } from './physics.js';
import { Meter } from './constants/meter.js';
import { Camera } from './constants/camera.js';
import { createMenu, hideMenu, showMenu } from './menu.js';
import { resizeRendererToDisplaySize } from './helpers/resizeRenderer.js';
import { uploadScore, fetchScores } from './db.js';
import { math } from '@tensorflow/tfjs-core';
import { draw } from '@tensorflow/tfjs-core/dist/ops/browser.js';

//FLAGS
let mode = 'menu';       // 'menu' | 'freePlay' | 'aroundTheWorld' | 'downtownCountdown'
let runPhase = 'idle';   // 'idle' | 'countdown' | 'playing' | 'finished'
let shotPhase = 'idle';  // 'idle' | 'aiming' | 'flying' | 'landing' | 'shrinking'
let passedTop = false;
let jumping = false;
let performanceMode = localStorage.getItem('performanceMode') ? localStorage.getItem('performanceMode') : 'false'; // if true, the environment is not drawn, to save performance
let deepshotsOnly = false;
// true while the ball sits in the hand
const ballIsHeld = () => shotPhase === 'idle' || shotPhase === 'aiming';

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

let stopWatch = 0;   // seconds elapsed in the current run
let timeInterval;    // the id of the stopwatch's setInterval, so endTimer can stop it
let countdownTimeout; // the id of the 3-2-1 countdown's current setTimeout, so goToMenu can stop it

let world, ballBody, ballCollider, sensors, eventQueue; // physics world, filled in init
const physicsStep = 1 / 60;   // seconds per physics step
let lastTime = 0;
let physicsTime = 0;    // real time that hasn't been simulated yet

let meterValue = 0;       // 0 = empty, 1 = full
let meterElement, meterFill, meterGreen; // the bar's elements, filled in init

let stats = {
    points: 0,
    finalTime: 0, // seconds of the last around the world run, kept for the upload (stopWatch is reset at the end)
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

const track = new Audio('music/lofi.mp3');
track.volume = 0.07; // set the volume to 10% of the original



const swish = new Audio('soundEffects/swish1.mp3');
swish.volume = 0.7; // set the volume to 70% of the original

const greenGiant = new Audio('soundEffects/GreenGiant.mp3');
greenGiant.volume = 0.02;

let ballScale = 1;      // the ball's size on screen: 1 = full size, 0 = gone
let landingTime = 0;    // seconds spent waiting for the ball to reach the floor

const gui = new GUI();
gui.close();                                // start collapsed: only the title bar is left
gui.domElement.style.top = 'auto';          // lil-gui sits in the top right corner by default, which is where the timer is
gui.domElement.style.bottom = '2%';         // so it goes to the bottom right instead

let jumpVelocity = 0;   // how fast the player is moving up (negative: down) during a jump

let targetPose = Player.poses.default;

//MOVEMENT 
const poseHold = {
    default: 300,
    loaded: 300,
    release: 300,
};
let poseUntil = 0; // the current pose is kept until this time
let jumpDelay = null; // the jump waiting to start (a setTimeout id), or null when none is waiting

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
        clearTimeout(jumpDelay); // the arms went back down before the jump started: cancel it
        jumpDelay = null;

        return;
    }

    if (loaded) {
        targetPose = Player.poses.loaded;
        poseUntil = now + poseHold.loaded;      // restart the clock on every loaded frame
        startMeter(); // start the meter when the arms are loaded (it checks by itself that a shot is possible)
        return;
    }

    if (rising && targetPose === Player.poses.loaded) {
        targetPose = Player.poses.release;   // start the swing early instead of waiting for a full release
        poseUntil = now + poseHold.release;

        // jump a moment after the arms start rising. only one timer at a time: this runs on pose frames,
        // and every frame would otherwise start its own jump
        if (!jumping && jumpDelay === null) {
            jumpDelay = setTimeout(() => {
                jumpDelay = null; // done, a new jump may be planned later
                startJump();
            }, 100); // wait 200 ms before jumping
        }

    }

    if (released) {
        targetPose = Player.poses.release;
        poseUntil = now + poseHold.release;
        releaseMeter(); // take the shot when the arms are released (it only does something while aiming)
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
    if (shotPhase === 'aiming') shotPhase = 'idle';   // the arms went back down: cancel the aim
};

const startMeter = () => {
    if (runPhase !== 'playing') return;   // the menu, the countdown and the after game screen do not allow shots
    if (shotPhase !== 'idle') return;     // already filling, or the ball is not in the hand

    if (mode === "freePlay" && deepshotsOnly || mode === 'downtownCountdown' && stats.hotstreak) {
        drawGreen(0.075); // the green zone is smaller during a hot streak   
    }
    else {
        drawGreen(Meter.greenWidth); // the green zone is normal size
    }
    shotPhase = 'aiming';
    meterValue = 0;
};

// starts the PERFECT!
const showPerfect = () => {
    const perfectElement = document.getElementById('shotPerfect');
    const tilt = (3 + Math.random() * 6) * (Math.random() < 0.5 ? -1 : 1);   // 3 to 9 degrees, to the left or the right
    perfectElement.style.setProperty('--tilt', tilt + 'deg');                 // the css animation turns it into the pop, the swing and the rest
    perfectElement.hidden = false;
    perfectElement.style.animation = 'none';   // restart the animation, also when the text is still showing from the last shot
    void perfectElement.offsetWidth;
    perfectElement.style.animation = '';
};

const releaseMeter = () => {
    if (shotPhase !== 'aiming') return;  // nothing to release
    console.log('released at', meterValue.toFixed(2));

    let greenBottom, greenTop;
    if (mode === 'downtownCountdown' && stats.hotstreak) {
        greenBottom = Meter.greenCentre - .075 / 2;
        greenTop = Meter.greenCentre + .075 / 2;
    } else {
        greenBottom = Meter.greenCentre - Meter.greenWidth / 2;
        greenTop = Meter.greenCentre + Meter.greenWidth / 2;
    }

    let power = 1;                                                         // 1 = the perfect shot
    if (meterValue < greenBottom) {
        const howEarly = (greenBottom - meterValue) / greenBottom;         // 0 at the green's edge, 1 at an empty meter
        power = 1 - howEarly * Meter.maxError;                             // early: less power, short
    } else if (meterValue > greenTop) {
        const howLate = (meterValue - greenTop) / (1 - greenTop);          // 0 at the green's edge, 1 at a full meter
        power = 1 + howLate * Meter.maxError;                              // late: more power, long
    } else {
        showPerfect();

        greenGiant.currentTime = 0;
        greenGiant.play();
        console.log('Perfect shot!');
    }

    shoot(power);

};

const updateMeter = (delta) => {
    if (shotPhase === 'aiming') {
        meterValue = Math.min(1, meterValue + delta / Meter.duration);   // stops at the top
    }
    meterElement.hidden = shotPhase !== 'aiming';
    meterFill.style.height = meterValue * 100 + '%';
};


const shoot = (power = 1) => {
    if (!ballIsHeld()) return; //avoid shooting if the ball is already flying
    stats.shots++;
    shotPhase = 'flying';
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

    let entryAngle;
    
    ballBody.setLinearDamping(Basketball.linearDamping);
    if (mode === 'downtownCountdown' && stats.hotstreak || mode === 'freePlay' && deepShotsOnly) {
         entryAngle = THREE.MathUtils.degToRad(45);  
         ballBody.setLinearDamping(0);     // how steeply the ball drops into the rim
         console.log('high arc');
    } else {
         entryAngle = THREE.MathUtils.degToRad(55);       // how steeply the ball drops into the rim
    }
    const time = Math.sqrt(2 * (horizontal * Math.tan(entryAngle) + distanceY) / gravity);

    const velocityX = distanceX / time;
    const velocityZ = distanceZ / time;

    const velocityY = ((distanceY + 0.5 * gravity * time * time) / time + 0.5 * gravity * deltaTime) * power; //formula for vertical motion under gravity ½.g.t²

    ballBody.setLinvel({ x: velocityX, y: velocityY, z: velocityZ }, true); //linear velocity
    ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true)// angular velocity (backspin)
}

// the shot is decided: let the ball land, shrink it away, and give it back to the player.
// this only starts the sequence, updateBallReturn does the work frame by frame
const shotReset = (made) => {
    const shrinkDuration = made ? Basketball.makeShrinkTime : Basketball.shrinkTime;
    shotPhase = (made || ballNearFloor()) ? 'shrinking' : 'landing';
    landingTime = 0;
};

// true when the ball is on the floor or within a few centimetres of it.
// the ball's position is its centre, which is one radius above the floor when it touches
const ballNearFloor = () => ballBody.translation().y <= Basketball.radius + 0.05;

// runs every frame: moves the ball through landing → shrinking → held, and grows it back in the hand
const updateBallReturn = (delta) => {
    if (shotPhase === 'landing') {
        // the ball keeps bouncing as a normal physics ball until it touches the floor
        landingTime += delta;
        if (ballNearFloor() || landingTime > Basketball.landingWait) shotPhase = 'shrinking';
    } else if (shotPhase === 'shrinking') {
        ballScale = Math.max(0, ballScale - delta / Basketball.shrinkTime); // from 1 to 0 in shrinkTime seconds
        if (ballScale === 0) {
            shotPhase = 'idle'; // from the next frame on the ball follows the hand again
            ballBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        }
    } else if (ballScale < 1) {
        ballScale = Math.min(1, ballScale + delta / Basketball.growTime); // grow back in the hand
    }
    //scale whole group.
    basketball.scale.setScalar(Math.max(ballScale, 0.001)); // never exactly 0, a scale of 0 cannot be drawn
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

        // points are the score, madeShots only counts makes for the shooting percentage
        stats.madeShots++;
        stats.streak++;
        if (mode === 'downtownCountdown' && stats.hotstreak) {
            stats.points += 4; // the deep shot
        }
        else {
            stats.points += 2; // a normal make
            stats.spotProgress++;
        }
        onMake();
        return
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

    if (mode !== 'freeplay' && !deepshotsOnly){
    const spot = Court.spots[stats.currentSpot];
    playerMesh.position.set(spot.x, 0, spot.z);
    playerMesh.rotation.y = spot.facing;
    placeCamera(); // move the camera to the current spot's position
    }
    stats.shootingPercentage = stats.shots > 0 ? (stats.madeShots / stats.shots) * 100 : 0;
    fire.heat.value = 0;
    ballMaterial.color.set(Colors.basketball);
    console.log('missed shot');
    shotReset(false);
}


const onMake = () => {
    stats.shootingPercentage = stats.shots > 0 ? (stats.madeShots / stats.shots) * 100 : 0;
    const p = ballBody.translation();
    const onFloor = p.y <= Basketball.radius + 0.02;

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
}


//STATS DISPLAY
const updateStatsDisplay = () => {
    const shotsElement = document.querySelector('#shots');
    const pointsElement = document.querySelector('#points');
    const madeShotsElement = document.querySelector('#madeShots');
    const shootingPercentageElement = document.querySelector('#shootingPercentage');

    shotsElement.textContent = stats.shots;
    pointsElement.textContent = stats.points;
    madeShotsElement.textContent = stats.madeShots;
    shootingPercentageElement.textContent = stats.shootingPercentage.toFixed(2) + '%';
};


// back to the main menu, from the after game screen or in the middle of a run
// shows the leaderboard card with the top 10 of a mode: called when a run starts
const showLeaderboard = (leaderboardMode) => {
    document.getElementById('leaderboard').hidden = false;
    loadLeaderboard(leaderboardMode); // not awaited: the run starts at once, the list fills in when the answer arrives
};

const goToMenu = () => {
    document.getElementById('leaderboard').hidden = true;
    // stop every timer that could still change the game after leaving it
    clearInterval(timeInterval);      // the stopwatch or the 60 second countdown of a run that is still going
    clearTimeout(countdownTimeout);   // the 3-2-1: its promise never resolves now, so the run after the await never starts
    clearTimeout(jumpDelay);          // a jump that was waiting to start
    jumpDelay = null;
    stopWatch = 0;
    document.getElementById('countdown').hidden = true;
    document.getElementById('afterGame').hidden = true;
    document.getElementById('timer').hidden = true;
    document.querySelector('#deepShotsOnly').hidden = true;
    mode = 'menu';
    runPhase = 'idle';
    placeCamera(true); // glide back to the menu camera
    showMenu();
};

//GAME MODES
const handleFreeplayClick = () => {
    document.getElementById('leaderboard').hidden = true; // free play has no scores to compare
    document.querySelector('#deepShotsOnly').hidden = false;
    mode = 'freePlay';
    runPhase = 'playing';   // free play has no countdown
    document.getElementById('timer').hidden = true;   // and no stopwatch
    hideMenu();
    placeCamera(); // move the camera to the current spot's position
};

const handleAroundTheWorldClick = () => {
    showLeaderboard('aroundTheWorld');
    document.querySelector('#deepShotsOnly').hidden = true;
    hideMenu();
    placeCamera(); // move the camera to the current spot's position
    startAroundTheWorld();
};

const handleDowntownCountdownClick = () => {
    showLeaderboard('downtownCountdown');
    document.querySelector('#deepShotsOnly').hidden = true;
    hideMenu();
    placeCamera(); // move the camera to the current spot's position
    startDowntownCountdown();
}

const startDowntownCountdown = async () => {
    mode = 'downtownCountdown';
    runPhase = 'countdown';
    await showCountDown(3);
    runPhase = 'playing';
    document.getElementById('timer').hidden = false;   // the stopwatch shows up when the run starts
    startCountdownTimer(60); // 60 seconds countdown
    stats.AroundTheWorldShots = 0;
    stats.spotProgress = 0;

    stats.nextSpot = 0;
    stats.streak = 0;
    stats.shots = 0;
    stats.madeShots = 0;
    stats.points = 0;
    stats.shootingPercentage = 0;
}


const startAroundTheWorld = async () => {
    mode = 'aroundTheWorld';
    runPhase = 'countdown';
    await showCountDown(3);
    runPhase = 'playing';
    document.getElementById('timer').hidden = false;   // the stopwatch shows up when the run starts

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
}


const endTimer = () => {
    clearInterval(timeInterval);
    const currentTime = stopWatch;
    console.log(`Time's up! Final time: ${currentTime} seconds`);
    stats.finalTime = currentTime; // kept for the upload, stopWatch is reset on the next line
    stopWatch = 0;
    runPhase = 'finished';

    resetUploadButton();
    loadLeaderboard(mode); // not awaited: the screen shows at once, the list fills in when the answer arrives
    document.getElementById('afterGame').hidden = false; // show the after game screen when the run ends
    document.getElementById('retry').hidden = false; // show the retry button for around the world
    document.getElementById('retry2').hidden = true; // show the retry button for downtown countdown
    document.getElementById('yourTime').textContent = `Your Time: ${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`;

}


const startTimer = () => {
    stats.AroundTheWorldShots = 0;
    timeInterval = setInterval(() => {
        stopWatch++;
        const minutes = Math.floor(stopWatch / 60);
        const seconds = stopWatch % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timerValue').textContent = formattedTime;
    }, 1000);
}

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
}

const endCountdownTimer = () => {
    clearInterval(timeInterval);
    const currentTime = stopWatch;
    console.log(`Time's up! Final time: ${currentTime} seconds`);

    stopWatch = 0;
    runPhase = 'finished';
    resetUploadButton();
    loadLeaderboard(mode); // not awaited: the screen shows at once, the list fills in when the answer arrives
    document.getElementById('retry').hidden = true; // show the retry button for around the world
    document.getElementById('retry2').hidden = false; // show the retry button for downtown countdown
    document.getElementById('afterGame').hidden = false; // show the after game screen when the run ends
    document.getElementById('yourTime').textContent = `Your score: ${stats.points} (${stats.shootingPercentage.toFixed(2)}%)`;
}

const showCountDown = async (seconds) => {
    const countdownElement = document.querySelector('#countdown');
    const nextNumber = seconds - 1;
    countdownElement.textContent = seconds;
    countdownElement.hidden = false;
    // restart the pop-in animation for every number (changing the text alone does not restart a css animation)
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
}

const drawGreen = (width = Meter.greenWidth) => {
    meterGreen.style.bottom = (Meter.greenCentre - width / 2) * 100 + '%';
    meterGreen.style.height = width * 100 + '%';
};




//PLAYER COLOUR
let colorIndex = 0;   // which of Colors.playerColors the player has, 0 is the default

// step is 1 for the next colour and -1 for the previous one, and it wraps around at both ends.
// playerMaterial is shared by every part of the game player and the menu player, so one change updates them all
const changePlayerColor = (step) => {
    const total = Colors.playerColors.length;
    colorIndex = (colorIndex + step + total) % total;
    playerMaterial.color.set(Colors.playerColors[colorIndex]);
};

//EVENTS
// every button and key listener of the game, set up once (call it once: calling it twice would double every click)
const setEvents = () => {
    // main menu: the two game modes
    if (performanceMode === 'true') {
        document.querySelector('#performanceModeCheckbox').checked = true;
    }

    // the colour arrows on the menu: previous and next colour for the player
    document.querySelector('#colorPrev').addEventListener('click', () => changePlayerColor(-1));
    document.querySelector('#colorNext').addEventListener('click', () => changePlayerColor(1));

    const usernameInput = document.querySelector('#usernameInput');
    usernameInput.addEventListener('input', () => {
        const username = usernameInput.value.trim();
        localStorage.setItem('username', username);
    });

    const uploadBtn = document.querySelector('#uploadScoreBtn');

    uploadBtn.addEventListener('click', async () => {
        uploadBtn.disabled = true; // no second click while sending (the :disabled css greys it out)
        uploadBtn.textContent = 'Sending…';
        try {
            await uploadScore(setData());
            uploadBtn.textContent = 'Uploaded!'; // stays disabled: this round is in
            loadLeaderboard(mode); // again, so the new score shows up in the list
        } catch (error) {
            console.error('Error uploading score:', error);
            uploadBtn.textContent = 'Failed, retry';
            uploadBtn.disabled = false; // let the player try again
        }
    });

    document.querySelector('#freePlayBtn').addEventListener('click', handleFreeplayClick);
    document.querySelector('#aroundTheWorldBtn').addEventListener('click', handleAroundTheWorldClick);
    document.querySelector('#downTownCountdownBtn').addEventListener('click', handleDowntownCountdownClick);



    document.querySelector('#deepShotOnlyCheckbox').addEventListener('change', (event) => {
        deepshotsOnly = event.target.checked;
        console.log('Deep shots only is now', deepshotsOnly);
        handleDeepshotsOnly();
    });

    document.querySelector('#performanceModeCheckbox').addEventListener('change', (event) => {
        performanceMode = event.target.checked ? 'true' : 'false';   // keep it a string, like at line 31
        localStorage.setItem('performanceMode', performanceMode);
        console.log('Performance mode is now', performanceMode);
        window.location.reload(); // reload the page to apply the change
    });

    // in game: back to the menu at any moment
    document.getElementById('menuBtn').addEventListener('click', goToMenu);

    // after game screen: back to the menu, or run it again
    document.getElementById('homeBtn').addEventListener('click', goToMenu);

    document.getElementById('retry').addEventListener('click', () => {
        document.getElementById('afterGame').hidden = true;
        startAroundTheWorld();
    });

    document.getElementById('retry2').addEventListener('click', () => {
        document.getElementById('afterGame').hidden = true;
        startDowntownCountdown();
    });

    // PERFECT!: hidden when its css animation is over
    document.getElementById('shotPerfect').addEventListener('animationend', (event) => {
        event.target.hidden = true;
    });

    // the shot meter: hold space to fill it, let go to shoot
    window.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && !event.repeat) startMeter();
    });
    window.addEventListener('keyup', (event) => {
        if (event.code === 'Space') releaseMeter();
    });
};

const init = async () => {

    const usernameInput = document.querySelector('#usernameInput');
    usernameInput.value = localStorage.getItem('username') || '';
    meterElement = document.querySelector('#meter');
    meterGreen = document.querySelector('#meterGreen');
    meterFill = document.querySelector('#meterFill');
    drawGreen(Meter.greenWidth); // set the green zone to its default size

    meterGreen.style.bottom = (Meter.greenCentre - Meter.greenWidth / 2) * 100 + '%';
    meterGreen.style.height = Meter.greenWidth * 100 + '%';

    canvas = document.querySelector('#c');
    renderer = new THREE.WebGPURenderer({
        canvas,
        alpha: true,
        antialias: true
    });

    renderer.shadowMap.enabled = true; // enable shadow maps

    scene = new THREE.Scene();
    scene.background = new THREE.Color(Colors.background);


    const light = new THREE.DirectionalLight(0xffffff, 15);
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

    if (performanceMode === 'false') {
        const environment = createEnvironment();
        scene.add(environment);
    }


    const player = createPlayer();
    playerMesh = player.player; // the player's y position, used for jumping

    joints = player.joints;
    scene.add(player.player);
    makeAxisGrid(player.player, 'player', 1);

    ({ basketball, ballMaterial, fire } = createBasketball());
    scene.add(basketball);
    makeAxisGrid(basketball, 'basketball', 1);

    ({ world, ballBody, ballCollider, sensors, eventQueue } = createPhysics());

    const fov = 75;
    const aspect = 2;  // the canvas default
    const near = 0.1;

    const far = 100;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    controls = new OrbitControls(camera, renderer.domElement); // moves `camera`, listens for mouse input on the canvas
    controls.enableDamping = true; // the movement glides to a stop instead of stopping dead
    controls.dampingFactor = 0.05;//glide
    // start already in the menu pose, so the first frame does not swoop in from the origin
    camera.position.set(Camera.menu.position.x, Camera.menu.position.y, Camera.menu.position.z);
    controls.target.set(Camera.menu.lookAt.x, Camera.menu.lookAt.y, Camera.menu.lookAt.z);
    placeCamera(true); // the goal is the menu pose too, so there is nothing to glide yet
    gui.add(controls, 'enabled').name('orbit camera (debug)'); // checkbox to switch the mouse control off


    setEvents(); // hook up every button and key in one place
}

const handleDeepshotsOnly = () => {
    let spot;
    if (deepshotsOnly) {
        spot = Court.spots[5];
        playerMesh.position.set(spot.x, 0, spot.z);
        playerMesh.rotation.y = spot.facing;
        placeCamera();
    } else {
        spot = Court.spots[stats.currentSpot];
        playerMesh.position.set(spot.x, 0, spot.z);
        playerMesh.rotation.y = spot.facing;
        placeCamera();
    }
};

const handleSpotChange = () => {
    if (  mode==="freePlay" && deepshotsOnly || mode === 'downtownCountdown' && stats.hotstreak) {
        const spot = Court.spots[5];
        playerMesh.position.set(spot.x, 0, spot.z);
        playerMesh.rotation.y = spot.facing;
        placeCamera(); // move the camera to the new player position
    }
    else {
        stats.currentSpot = (stats.currentSpot + 1) % Court.rotationSpots;   // 0, 1, 2, 3, 4, then 0 again
        const spot = Court.spots[stats.currentSpot];
        playerMesh.position.set(spot.x, 0, spot.z);
        playerMesh.rotation.y = spot.facing;
        placeCamera(); // move the camera to the new player position
    }
};

// where the camera is heading: placeCamera sets it, smoothCamera moves the camera towards it every frame
const cameraGoal = { position: new THREE.Vector3(), target: new THREE.Vector3() };

const placeCamera = (menu = false) => {
    if (menu) {
        // menu view: fixed in the world, not tied to the player
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

// glides the camera and the point it looks at towards the goal, called every frame
const smoothCamera = (delta) => {
    const t = 1 - Math.exp(-3 * delta);   // 3 = speed, bigger is snappier. the exp makes it independent of the framerate
    camera.position.lerp(cameraGoal.position, t);
    controls.target.lerp(cameraGoal.target, t);
};


//HELPERS AND DEBUG
function makeAxisGrid(node, label, units) {
    const helper = new AxisGridHelper(node, units);
    gui.add(helper, 'visible').name(label); // a checkbox bound to helper.visible, shown with this label
}


//DATA
// seconds as m:ss, for the around the world times
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;


const loadLeaderboard = async (leaderboardMode) => {
    const list = document.getElementById('leaderboard__list');
    const status = document.getElementById('leaderboard__status');
    const isTime = leaderboardMode === 'aroundTheWorld';

    document.getElementById('leaderboard__title').textContent = isTime ? 'Fastest times' : 'Top scores';
    document.getElementById('leaderboard__unit').textContent = isTime ? 'time' : 'points';
    status.textContent = 'Loading…';
    status.hidden = false;

    try {
        const { scores } = await fetchScores(leaderboardMode);
        const myName = (localStorage.getItem('username') || '').toLowerCase();

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
        console.error('Error loading the leaderboard:', error);
        list.replaceChildren();
        status.textContent = 'Leaderboard unavailable';
    }
};

// a new round can be uploaded again: the button back to its start state
const resetUploadButton = () => {
    const uploadBtn = document.querySelector('#uploadScoreBtn');
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload score';
};

const setData = () => {
    const form = document.querySelector('#afterGame__form');
    const formData = new FormData(form);


    const setName = localStorage.getItem('username') ? localStorage.getItem('username').trim() : 'anonymous';

    formData.set('name', setName);

    // the mode as its id, exactly what scores.php checks against: 'downtownCountdown' or 'aroundTheWorld'
    formData.set('mode', mode);

    // the result: points for downtown countdown, the finished time for around the world
    const formattedScore = mode === 'downtownCountdown' ? stats.points : stats.finalTime;
    formData.set('score', formattedScore);

    return formData;
};

//RENDER LOOP
const render = (time) => {
    time *= 0.001; //time in seconds
    const delta = Math.min(time - lastTime, 0.1);   // seconds since the last frame, capped
    lastTime = time;

    physicsTime += delta;

    if (ballIsHeld()) {
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

    smoothCamera(delta); // glide towards the camera goal set by placeCamera
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



await motionDetection(handlePose);// start the motion detection and shot counting, handlePose gets the arms every frame
document.getElementById('loading__container').style.visibility = 'hidden';   // setup finished: hide the loading screen
track.play(); // start the music


await createMenu(); // build the 3D menu and start drawing it (see menu.js)

init();
await renderer.init(); //initialize the renderer and wait for it to be ready

renderer.setAnimationLoop(render); //loop the animation loop and call the render function for each frame