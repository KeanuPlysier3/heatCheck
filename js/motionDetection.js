import * as tf from '@tensorflow/tfjs-core';
// Add the WebGPU backend to the global backend registry.
import '@tensorflow/tfjs-backend-webgpu';


import * as poseDetection from '@tensorflow-models/pose-detection';


let detector = undefined;
let video = undefined;
let canvas = undefined;
let ctx = undefined;
let onPose = undefined; // the function to call every frame with the measured arms, handed in by script.js

const minScore = 0.2; //min certainity

// the thresholds for recognising a shot, in one place so they can be tuned by feel
const shot = {
    loadedMaxAngle: 110, // elbow bent at least this far (smaller angle = more bent) counts as loaded
    releaseMinAngle: 160, // elbow opened past this counts as a release
    loadTimeout: 1500, 
    cooldown: 1000, 
};

//shot memory
const shotState = {
    loadedAt: { left: null, right: null },    

    cooldownUntil: 0, 
    count: 0, 
};

export const motionDetection = async (poseCallback) => {
    onPose = poseCallback;

    //the backend
    const success = await tf.setBackend('webgpu');
    await tf.ready();
    console.log('webgpu started:', success, '| backend in use:', tf.getBackend());


    //the webcam, playing
    video = document.querySelector("video");
    const constraints = {
        audio: false,
        video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };
    await getMedia(constraints);

    //the overlay gets the same size in pixels as the video, so keypoint x/y can be drawn as they are
    canvas = document.querySelector("#overlay");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx = canvas.getContext("2d");

    detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }//fast model, but less accurate than the heavy model
    );

    console.log("Detector initialized:", detector);

    detect();


};

async function getMedia(constraints) {
    let stream = null;

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();
    } catch (err) {
        console.error("Error accessing media devices.", err);
    }
}


const detect = async () => {
    const poses = await detector.estimatePoses(video);
    drawKeypoints(poses);

    if (poses.length > 0) {
        const left = measureArm(poses[0], 'left');
        const right = measureArm(poses[0], 'right');
        drawArm(left);
        drawArm(right);
        if (onPose) onPose([left, right]); // an arm is null when it is not visible enough

        const now = performance.now(); // ms since the page loaded
        updateShot('left', left, now);
        updateShot('right', right, now);
        showReadout(left, right, now);
    }

    requestAnimationFrame(detect);
}

// a green circle on every keypoint the model is reasonably sure about
const drawKeypoints = (poses) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // wipe the previous frame's dots
    if (poses.length === 0) return; // nobody in view

    ctx.fillStyle = "lime";
    poses[0].keypoints.forEach((keypoint) => {
        if (keypoint.score < minScore) return;
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 10, 0, Math.PI * 2); // a full circle, radius 10 px
        ctx.fill();
    });
}

// finds a keypoint by its name, e.g. 'left_wrist'
const point = (pose, name) => pose.keypoints.find((keypoint) => keypoint.name === name);



// the angle at the elbow, between the upper arm (to the shoulder) and the forearm (to the wrist)
const angleAt = (a, b, c) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const lengths = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
    const cos = Math.min(1, Math.max(-1, dot / lengths)); // rounding can push it a hair past ±1, which would give NaN
    return Math.acos(cos) * 180 / Math.PI; // acos gives radians, convert to degrees
};


const measureArm = (pose, side) => {
    //capure points
    const shoulder = point(pose, side + '_shoulder');
    const elbow = point(pose, side + '_elbow');
    const wrist = point(pose, side + '_wrist');
    const nose = point(pose, 'nose');

    if ([shoulder, elbow, wrist, nose].some((p) => p.score < minScore)) return null; // if any of the points are not visible enough, return null

    const elbowAngle = angleAt(shoulder, elbow, wrist);
    const wristAboveHead = wrist.y < nose.y;
    const handLow = wrist.y > shoulder.y;

    return {
        shoulder, elbow, wrist, elbowAngle, wristAboveHead, handLow,
        loaded: handLow && elbowAngle < shot.loadedMaxAngle, // elbow bent enough and hand low enough to count as loaded
        released: wristAboveHead && elbowAngle > shot.releaseMinAngle, // elbow opened enough and hand high enough to count as released
    };
};

// draws line between shoulder, elbow and wrist.
const drawArm = (arm) => {
    if (!arm) return;
    ctx.strokeStyle = arm.released ? 'limegreen' : arm.loaded ? 'blue' : 'white';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(arm.shoulder.x, arm.shoulder.y);
    ctx.lineTo(arm.elbow.x, arm.elbow.y);
    ctx.lineTo(arm.wrist.x, arm.wrist.y);
    ctx.stroke();
};


const updateShot = (side, arm, now) => {
    if (now < shotState.cooldownUntil) return; //still in cooldown
    if (!arm) return;

    if (arm.loaded) {
        shotState.loadedAt[side] = now; // remember the most recent moment this arm was loaded
        return;
    }

    const loadedAt = shotState.loadedAt[side];
    if (loadedAt === null) return; 

    if (now - loadedAt > shot.loadTimeout) {
        shotState.loadedAt[side] = null; // loaded too long ago, forget it
        return;
    }


    //shot only possible if state holds a loaded arm and it was recent enough.
    if (arm.released) {
        shotState.loadedAt.left = null; 
        shotState.loadedAt.right = null;
        shotState.cooldownUntil = now + shot.cooldown;
        shotReleased(now, side);
    }
};

// the one event every input will end in. here it only shows the shot; in the game it starts the shot
const shotReleased = (time, side) => {
    shotState.count++;
    console.log(`SHOT #${shotState.count} with the ${side} arm at ${(time / 1000).toFixed(2)} s`);

    const banner = document.querySelector('#shotBanner');
    banner.hidden = false;
    clearTimeout(banner.hideTimer);
    banner.hideTimer = setTimeout(() => { banner.hidden = true; }, 600); // show SHOT! for 0.6 s
};

// the live numbers under the video, one line per arm, plus the shot count
const showReadout = (left, right, now) => {
    const line = (label, side, arm) => {
        if (!arm) return `${label}  not visible enough`;
        const loadedAt = shotState.loadedAt[side];
        const state = now < shotState.cooldownUntil ? 'cooldown'
            : loadedAt !== null ? `loaded ${((now - loadedAt) / 1000).toFixed(1)} s ago`
            : 'ready';
        return `${label}  elbow ${arm.elbowAngle.toFixed(0).padStart(3)}°   wrist above head: ${arm.wristAboveHead ? 'yes' : 'no '}   ${state}`;
    };
    document.querySelector('#readout').textContent =
        line('left ', 'left', left) + '\n' + line('right', 'right', right) + '\n' + `shots: ${shotState.count}`;
};

