import * as THREE from 'three/webgpu';
import { Cat } from '../constants/cat';
import { Colors } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';
import { Boombox } from '../constants/boombox';

// a flat, bright material like the player's and the boombox's: it ignores the light
const flat = (color) => new THREE.MeshBasicMaterial({ color });

// a box with its outline shell, put at (x, y, z) inside parent
const addBox = (parent, width, height, depth, material, x, y, z, outline = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    if (outline) {
        mesh.add(createOutlineMesh(new THREE.BoxGeometry(width + Outline.thickness * 2, height + Outline.thickness * 2, depth + Outline.thickness * 2)));
    }
    parent.add(mesh);
    return mesh;
};

// a pointy ear: a cone with 4 sides, so it is a little pyramid like the rest of the low-poly look
const addEar = (parent, material, x, y, z) => {
    const { radius, height } = Cat.ear;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 4), material);
    ear.position.set(x, y, z);
    ear.rotation.y = Math.PI / 4; // turn the pyramid so a flat side faces the front, not a corner
    ear.add(createOutlineMesh(new THREE.ConeGeometry(radius + Outline.thickness, height + Outline.thickness * 2, 4)));
    parent.add(ear);
    return ear;
};

// a head facing -x, built around its own middle: the box, two ears, the eyes and a pink nose.
// awake: the eyes are open (small dark squares), asleep they are closed (thin lines)
const createHead = (fur, pink, dark, awake) => {
    const { head, eye } = Cat;
    const headGroup = new THREE.Object3D();
    addBox(headGroup, head.width, head.height, head.depth, fur, 0, 0, 0);

    // ears on top of the head, one at each side
    const earY = head.height / 2 + Cat.ear.height / 2 - .01;
    addEar(headGroup, fur, .01, earY, -head.depth / 2 + Cat.ear.radius);
    addEar(headGroup, fur, .01, earY, head.depth / 2 - Cat.ear.radius);

    // the face is the -x side of the head. the eyes have no outline (they are dark already),
    // and sit 2 mm in front of the face so they do not flicker inside it
    const faceX = -head.width / 2 - .002;
    const eyeHeight = awake ? eye.openHeight : eye.height;
    const eyeWidth = awake ? eye.openHeight : eye.width;
    addBox(headGroup, .004, eyeHeight, eyeWidth, dark, faceX, .015, -.035, false);
    addBox(headGroup, .004, eyeHeight, eyeWidth, dark, faceX, .015, .035, false);
    addBox(headGroup, .006, .015, .02, pink, faceX, -.02, 0, false); // nose
    return headGroup;
};

// the sleeping pose: curled up on the floor, head resting on the front paws, tail wrapped round the front (+z)
const createSleeping = (fur, pink, dark) => {
    const pose = new THREE.Object3D();
    const { body, head, paw, tail } = Cat;

    // body: the loaf, lying on the floor (a box is placed by its middle, so half its height up)
    addBox(pose, body.width, body.height, body.depth, fur, 0, body.height / 2, 0);

    // where the head goes: at the -x end, half on the body, resting on the paws
    const headX = -body.width / 2 - head.width / 2 + .05;

    // front paws: under the chin, sticking out 2 cm in front of the face
    const pawX = headX - head.width / 2 + paw.width / 2 - .02;
    addBox(pose, paw.width, paw.height, paw.depth, fur, pawX, paw.height / 2, .03);
    addBox(pose, paw.width, paw.height, paw.depth, fur, pawX, paw.height / 2, .09);

    // head: rolled onto its side, as cats do when they sleep
    const headGroup = createHead(fur, pink, dark, false);
    headGroup.position.set(headX, paw.height + head.height / 2, .06);
    headGroup.rotation.x = head.tilt;
    pose.add(headGroup);

    // tail: along the front of the body, on the floor, and the tip curling in towards the paws
    const tailZ = body.depth / 2 + tail.thickness / 2;
    addBox(pose, tail.length, tail.thickness, tail.thickness, fur, .03, tail.thickness / 2, tailZ);
    const tip = addBox(pose, tail.tipLength, tail.thickness, tail.thickness, fur,
        .03 - tail.length / 2 - tail.tipLength / 2 + .03, tail.thickness / 2, tailZ - .03);
    tip.rotation.y = .5;

    return pose;
};

// the standing pose: on four legs, head up, eyes open, tail straight up at the back (+x)
const createStanding = (fur, pink, dark) => {
    const pose = new THREE.Object3D();
    const { head, tail } = Cat;
    const { width, height, depth, legHeight, legSize } = Cat.standing;
    const bodyY = legHeight + height / 2;

    // body: a slimmer box on top of the legs
    addBox(pose, width, height, depth, fur, 0, bodyY, 0);

    // four legs, one under each corner of the body
    const legX = width / 2 - legSize / 2 - .01;
    const legZ = depth / 2 - legSize / 2;
    [[-legX, -legZ], [-legX, legZ], [legX, -legZ], [legX, legZ]].forEach(([x, z]) => {
        addBox(pose, legSize, legHeight, legSize, fur, x, legHeight / 2, z);
    });

    // head: up and in front of the body, looking ahead
    const headGroup = createHead(fur, pink, dark, true);
    headGroup.position.set(-width / 2 - head.width / 2 + .04, bodyY + height / 2 + .02, 0);
    pose.add(headGroup);

    // tail: up from the back end, leaning back a little
    const tailMesh = addBox(pose, tail.thickness, tail.length, tail.thickness, fur,
        width / 2 + .03, bodyY + tail.length / 2 - .02, 0);
    tailMesh.rotation.z = -.3;

    return pose;
};

// the cat next to the boombox. both poses are built once, and setAwake shows one of them:
// asleep (curled up) or awake (standing). returned like the player's joints, so the game can change the pose
export const createCat = () => {
    const cat = new THREE.Object3D();

    // one random fur colour per cat, the same for every part of both poses
    const fur = flat(Cat.catColors[Math.floor(Math.random() * Cat.catColors.length)]);
    const pink = flat(Cat.innerEar);
    const dark = flat(Colors.outline);

    const sleeping = createSleeping(fur, pink, dark);
    const standing = createStanding(fur, pink, dark);
    standing.visible = false; // it starts asleep
    cat.add(sleeping, standing);

    const setAwake = (awake) => {
        sleeping.visible = !awake;
        standing.visible = awake;
    };

    cat.position.set(Boombox.x + 1.5, 0, Boombox.z);

    
    const faceTowards = (x, z) => {
        const toX = x - cat.position.x;
        const toZ = z - cat.position.z;
        cat.rotation.y = Math.atan2(toZ, -toX);
    };

    return { cat, setAwake, faceTowards };
};
