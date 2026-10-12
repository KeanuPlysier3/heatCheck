import * as THREE from 'three/webgpu';
import { Track } from '../constants/track';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

// a colour from the palette as a css colour, which is what a canvas wants
const css = (color) => '#' + color.toString(16).padStart(6, '0');

const litMaterial = (color) => new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: SelfLight });

// a box with its outline as a child
const outlinedBox = (width, height, depth, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.add(createOutlineMesh(new THREE.BoxGeometry(width + Outline.thickness * 2, height + Outline.thickness * 2, depth + Outline.thickness * 2)));
    return mesh;
};

// the top of the deck: one sleeper drawn on a small canvas, repeated along the whole track, like the fence's diamond.
// the canvas covers one sleeperSpacing along the track and the deck's full width across it
const createSleeperTexture = () => {
    const ppm = Track.pixelsPerMetre;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(Track.sleeperSpacing * ppm); // along the track
    canvas.height = Math.round(Track.deckWidth * ppm); // across the track
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = css(Colors.trackDeck);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // one sleeper: a wooden bar across the track, as wide as the rails plus a bit on each side
    const sleeperLength = (Track.railGauge + 0.6) * ppm;
    ctx.fillStyle = css(Colors.trackSleeper);
    ctx.fillRect(canvas.width * 0.3, (canvas.height - sleeperLength) / 2, canvas.width * 0.4, sleeperLength);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping; // repeat along the track
    texture.repeat.set(Track.length / Track.sleeperSpacing, 1); // one sleeper every sleeperSpacing, once across
    return texture;
};

export const createTrack = () => {
    const track = new THREE.Object3D();
    const steel = litMaterial(Colors.trackSteel);

    // deck: a long box. the top gets the painted sleepers, the other sides are steel.
    // a box takes six materials in the order +x, -x, +y (top), -y, +z, -z
    const sleeperTexture = createSleeperTexture();
    const topMaterial = new THREE.MeshPhongMaterial({ map: sleeperTexture, emissive: 0xffffff, emissiveMap: sleeperTexture, emissiveIntensity: SelfLight });
    const deck = outlinedBox(Track.length, Track.deckThickness, Track.deckWidth, [steel, steel, topMaterial, steel, steel, steel]);
    deck.position.set(0, Track.groundY + Track.deckY - Track.deckThickness / 2, Track.centreZ); // its top at deckY
    track.add(deck);

    // columns: one under each edge of the deck, every columnSpacing along the track
    const columnHeight = Track.deckY - Track.deckThickness; // from the ground to the underside of the deck
    const edgeZ = Track.deckWidth / 2 - Track.columnSize; // a little in from the deck's edges
    for (let x = -Track.length / 2 + Track.columnSpacing / 2; x < Track.length / 2; x += Track.columnSpacing) {
        [-edgeZ, edgeZ].forEach((offsetZ) => {
            const column = outlinedBox(Track.columnSize, columnHeight, Track.columnSize, steel);
            column.position.set(x, Track.groundY + columnHeight / 2, Track.centreZ + offsetZ);
            track.add(column);
        });
    }

    // rails: two thin bars along the whole deck, railGauge apart, lying on its top
    const railMaterial = litMaterial(Colors.trackRail);
    [-Track.railGauge / 2, Track.railGauge / 2].forEach((offsetZ) => {
        const rail = outlinedBox(Track.length, Track.railHeight, Track.railWidth, railMaterial);
        rail.position.set(0, Track.groundY + Track.deckY + Track.railHeight / 2, Track.centreZ + offsetZ);
        track.add(rail);
    });

    return track;
};
