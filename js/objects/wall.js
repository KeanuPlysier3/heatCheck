import * as THREE from 'three/webgpu';
import { Wall } from '../constants/wall';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

// css colour
const css = (color) => '#' + color.toString(16).padStart(6, '0');

const litMaterial = (color) => new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: SelfLight });

// outlined box
const outlinedBox = (width, height, depth, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.add(createOutlineMesh(new THREE.BoxGeometry(width + Outline.thickness * 2, height + Outline.thickness * 2, depth + Outline.thickness * 2)));
    return mesh;
};

// mural
const paintMural = () => {
    const ppm = Wall.pixelsPerMetre;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(Wall.width * ppm);
    canvas.height = Math.round(Wall.height * ppm);
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // wall colour
    ctx.fillStyle = css(Colors.wallConcrete);
    ctx.fillRect(0, 0, w, h);

    // sunset disc
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = css(Colors.outline);
    ctx.lineWidth = 0.08 * ppm;

    ctx.fillStyle = css(Colors.background); // the sunset orange of the sky
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.55, h * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // graffiti letters
    const fontSize = Wall.textHeight * ppm;
    ctx.font = `900 ${fontSize}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textX = w / 2;
    const textY = h * 0.52;

    ctx.save();
    ctx.translate(textX, textY);
    ctx.rotate(-0.05); // tilted a little, painted by hand

    ctx.fillStyle = css(Colors.courtPaint); // the shadow, shifted down and right: a 3d block-letter look
    ctx.fillText(Wall.text, 0.12 * ppm, 0.12 * ppm);

    ctx.lineWidth = 0.14 * ppm;
    ctx.strokeStyle = css(Colors.outline);
    ctx.strokeText(Wall.text, 0, 0);
    ctx.fillStyle = css(Colors.hoopPole); // the yellow of the pole
    ctx.fillText(Wall.text, 0, 0);

    // drips
    const textWidth = ctx.measureText(Wall.text).width;
    ctx.fillStyle = css(Colors.hoopPole);
    [0.08, 0.21, 0.37, 0.55, 0.71, 0.9].forEach((spot, i) => {
        const dripX = -textWidth / 2 + spot * textWidth;
        const dripLength = (0.25 + (i % 3) * 0.15) * ppm;
        const dripWidth = 0.07 * ppm;
        ctx.fillRect(dripX - dripWidth / 2, fontSize * 0.32, dripWidth, dripLength);
        ctx.beginPath();
        ctx.arc(dripX, fontSize * 0.32 + dripLength, dripWidth * 0.8, 0, Math.PI * 2); // the round blob at the end
        ctx.fill();
    });
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

export const createWall = () => {
    const wall = new THREE.Object3D();

    // wall
    const mural = paintMural();
    const muralMaterial = new THREE.MeshPhongMaterial({ map: mural, emissive: 0xffffff, emissiveMap: mural, emissiveIntensity: SelfLight });
    const concrete = litMaterial(Colors.wallConcrete);
    const body = outlinedBox(Wall.width, Wall.height, Wall.thickness, [concrete, concrete, concrete, concrete, concrete, muralMaterial]);
    body.position.set(0, Wall.groundY + Wall.height / 2, Wall.centreZ); // a box is centred on its middle
    wall.add(body);

    // coping
    const coping = outlinedBox(Wall.width + Wall.copingOverhang * 2, Wall.copingHeight, Wall.thickness + Wall.copingOverhang * 2, litMaterial(Colors.cornice));
    coping.position.set(0, Wall.groundY + Wall.height + Wall.copingHeight / 2, Wall.centreZ);
    wall.add(coping);

    return wall;
};
