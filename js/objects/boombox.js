import * as THREE from 'three/webgpu';
import { Boombox } from '../constants/boombox';
import { Colors } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

// a flat, bright material like the player's: it ignores the light, so the colours stay as they are
const flat = (color) => new THREE.MeshBasicMaterial({ color });

// a box with a black outline around it, put at (x, y, z) inside parent
const addBox = (parent, width, height, depth, color, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), flat(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.add(createOutlineMesh(new THREE.BoxGeometry(width + Outline.thickness * 2, height + Outline.thickness * 2, depth + Outline.thickness * 2)));
    parent.add(mesh);
    return mesh;
};

// a round disc facing the front (+z) with a black outline, put at (x, y, z) inside parent
const addDisc = (parent, radius, depth, color, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 16), flat(color));
    mesh.rotation.x = Math.PI / 2; // a cylinder stands upright by default, turn it so its flat side faces the front
    mesh.position.set(x, y, z);
    mesh.add(createOutlineMesh(new THREE.CylinderGeometry(radius + Outline.thickness, radius + Outline.thickness, depth + Outline.thickness * 2, 16)));
    parent.add(mesh);
    return mesh;
};

// returns the whole boombox and its screen. the screen is a plain dark plane for now: later its material gets the shader
export const createBoombox = () => {
    const boombox = new THREE.Object3D();
    const { width, height, depth } = Boombox;
    const front = depth / 2; // z of the front face of the body

    // body
    addBox(boombox, width, height, depth, Colors.accent, 0, height / 2, 0);

    // speakers: a dark ring and a cream cone sticking out a little further
    [-Boombox.speakerX, Boombox.speakerX].forEach((x) => {
        addDisc(boombox, Boombox.speakerRadius, Boombox.speakerDepth, Colors.outline, x, height / 2, front + Boombox.speakerDepth / 2);
        addDisc(boombox, Boombox.coneRadius, Boombox.speakerDepth, Colors.hoopBackboard, x, height / 2, front + Boombox.speakerDepth);
    });

    // the screen: a dark frame with a plane in front of it. the plane's uv goes from 0 to 1, as the shader will want
    const frameWidth = Boombox.screenWidth + Boombox.frameBorder * 2;
    const frameHeight = Boombox.screenHeight + Boombox.frameBorder * 2;
    addBox(boombox, frameWidth, frameHeight, 0.02, Colors.outline, 0, Boombox.screenY, front + 0.005);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(Boombox.screenWidth, Boombox.screenHeight), flat(Colors.windowDark));
    screen.position.set(0, Boombox.screenY, front + 0.0175); // just in front of the frame, so the two do not flicker
    boombox.add(screen);

    // two knobs under the screen
    [-Boombox.knobX, Boombox.knobX].forEach((x) => {
        addDisc(boombox, Boombox.knobRadius, 0.03, Colors.hoopPole, x, Boombox.knobY, front + 0.015);
    });

    // the carrying handle: a bar on two posts
    const postHeight = Boombox.handleRise;
    const handleX = Boombox.handleLength / 2 - 0.03;
    [-handleX, handleX].forEach((x) => {
        addBox(boombox, 0.04, postHeight, 0.04, Colors.outline, x, height + postHeight / 2, 0);
    });
    addBox(boombox, Boombox.handleLength, 0.04, 0.05, Colors.outline, 0, height + postHeight + 0.01, 0);

    // the antenna: a thin stick leaning back from the top right corner, with a ball on the end
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(Boombox.antennaRadius, Boombox.antennaRadius, Boombox.antennaLength, 8),
        flat(Colors.fencePost)
    );
    antenna.add(createOutlineMesh(new THREE.CylinderGeometry(Boombox.antennaRadius + Outline.thickness, Boombox.antennaRadius + Outline.thickness, Boombox.antennaLength + Outline.thickness * 2, 8)));
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(Boombox.antennaRadius * 2.2, 8, 8), flat(Colors.courtPaint));
    antennaTip.position.y = Boombox.antennaLength / 2; // on the top end of the stick
    antenna.add(antennaTip);
    antenna.position.set(width / 2 - 0.08, height + Boombox.antennaLength / 2 - 0.02, -depth / 4);
    antenna.rotation.set(-Boombox.antennaTilt, 0, -Boombox.antennaTilt); // leans backwards and to the right
    boombox.add(antenna);

    // where it stands
    boombox.position.set(Boombox.x, 0, Boombox.z);
    boombox.rotation.y = Boombox.facing;

    return { boombox, screen };
};
