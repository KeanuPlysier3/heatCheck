import * as THREE from 'three/webgpu';
import { Buildings } from '../constants/buildings';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

// css colour
const css = (color) => '#' + color.toString(16).padStart(6, '0');

// materials
const materials = new Map();
const plainMaterial = (color) => {
    if (!materials.has(color)) {
        materials.set(color, new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: SelfLight }));
    }
    return materials.get(color);
};

// outlined box
const outlinedBox = (width, height, depth, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.add(createOutlineMesh(new THREE.BoxGeometry(width + Outline.thickness * 2, height + Outline.thickness * 2, depth + Outline.thickness * 2)));
    return mesh;
};


const paintFront = (length, height, color, kind) => {
    const ppm = Buildings.pixelsPerMetre;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(length * ppm);
    canvas.height = Math.round(height * ppm);
    const ctx = canvas.getContext('2d');

    // height on the canvas
    const fromGround = (metres) => canvas.height - metres * ppm;

    ctx.fillStyle = css(color);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const storeys = Math.floor(height / Buildings.storeyHeight);
    const columns = Buildings.windowsPerStorey;
    const cell = length / columns; // the width of the strip of wall each window sits in

    for (let storey = 0; storey < storeys; storey++) {
        for (let column = 0; column < columns; column++) {
            const middleColumn = column === Math.floor(columns / 2);
            if (storey === 0 && kind === 'brownstone' && middleColumn) continue; // the front door goes here

            const centreX = (column + 0.5) * cell; // the middle of this window, in metres along the front
            const sillY = storey * Buildings.storeyHeight + (Buildings.storeyHeight - Buildings.windowHeight) / 2;
            ctx.fillStyle = css(Math.random() < Buildings.litChance ? Colors.windowLit : Colors.windowDark);
            ctx.fillRect(
                (centreX - Buildings.windowWidth / 2) * ppm,
                fromGround(sillY + Buildings.windowHeight),
                Buildings.windowWidth * ppm,
                Buildings.windowHeight * ppm,
            );
        }
    }

    if (kind === 'brownstone') {
        // door
        const stoopTop = Buildings.brownstones.stoopSteps * Buildings.brownstones.stoopStepHeight;
        ctx.fillStyle = css(Colors.door);
        ctx.fillRect((length / 2 - 0.55) * ppm, fromGround(stoopTop + 2.1), 1.1 * ppm, 2.1 * ppm);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

// building
const createBuilding = ({ depth, length, height, color, kind }) => {
    const building = new THREE.Object3D();

    // walls and front
    const frontTexture = paintFront(length, height, color, kind);
    const frontMaterial = new THREE.MeshPhongMaterial({ map: frontTexture, emissive: 0xffffff, emissiveMap: frontTexture, emissiveIntensity: SelfLight });
    const wall = plainMaterial(color);

    const body = outlinedBox(depth, height, length, [frontMaterial, wall, wall, wall, wall, wall]);
    body.position.set(-depth / 2, Buildings.groundY + height / 2, 0);
    building.add(body);

    // cornice
    const cornice = outlinedBox(depth + Buildings.corniceOverhang, Buildings.corniceHeight, length + Buildings.corniceOverhang * 2, plainMaterial(Colors.cornice));
    cornice.position.set(-depth / 2 + Buildings.corniceOverhang / 2, Buildings.groundY + height + Buildings.corniceHeight / 2, 0);
    building.add(cornice);

    if (kind === 'brownstone') {
        // stoop
        const stoop = Buildings.brownstones;
        for (let step = 0; step < stoop.stoopSteps; step++) {
            const stepHeight = (stoop.stoopSteps - step) * stoop.stoopStepHeight;
            const stepMesh = outlinedBox(stoop.stoopStepDepth, stepHeight, stoop.stoopWidth, plainMaterial(color));
            stepMesh.position.set(stoop.stoopStepDepth * (step + 0.5), Buildings.groundY + stepHeight / 2, 0);
            building.add(stepMesh);
        }
    }

    // roof
    building.userData.roof = new THREE.Vector3(-depth / 2, Buildings.groundY + height + Buildings.corniceHeight, 0);
    return building;
};

// placement
const placeBuilding = (building, x, z, turn) => {
    building.position.set(x, 0, z);
    building.rotation.y = turn;
    building.updateMatrix(); // so the roof position below can be worked out right away
    return building;
};

// water tower
const createWaterTower = ({ x, y, z }) => {
    const tower = new THREE.Object3D();
    const { waterTowerRadius: radius, waterTowerHeight: height, waterTowerLegs: legs } = Buildings;
    const wood = plainMaterial(Colors.waterTower);

    // legs
    const legOffset = radius * 0.6;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const leg = outlinedBox(0.12, legs, 0.12, plainMaterial(Colors.cornice));
        leg.position.set(sx * legOffset, legs / 2, sz * legOffset);
        tower.add(leg);
    });

    // barrel and roof
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 10), wood);
    barrel.position.y = legs + height / 2;
    barrel.add(createOutlineMesh(new THREE.CylinderGeometry(radius + Outline.thickness, radius + Outline.thickness, height + Outline.thickness * 2, 10)));
    tower.add(barrel);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.1, 0.9, 10), wood);
    roof.position.y = legs + height + 0.45; // a cone is centred on its middle too
    roof.add(createOutlineMesh(new THREE.ConeGeometry(radius * 1.1 + Outline.thickness, 0.9 + Outline.thickness * 2, 10)));
    tower.add(roof);

    tower.position.set(x, y, z);
    return tower;
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

export const createBuildings = () => {
    const buildings = new THREE.Object3D();
    const made = { brownstones: [], farSide: [], backRow: [] };

    // brownstones
    const row = Buildings.brownstones;
    for (let i = 0; i < row.count; i++) {
        const fromZ = row.firstZ + i * row.width;
        const house = createBuilding({
            depth: row.depth, length: row.width,
            height: Math.round(randomBetween(row.heightMin, row.heightMax)),
            color: row.colors[i % row.colors.length],
            kind: 'brownstone',
        });
        buildings.add(placeBuilding(house, row.frontX, fromZ + row.width / 2, 0));
        made.brownstones.push(house);
    }

    // far side buildings
    const far = Buildings.farSide;
    far.blocks.forEach((block) => {
        const building = createBuilding({
            depth: far.depth, length: block.toZ - block.fromZ, height: block.height,
            color: block.color, kind: 'plain',
        });
        buildings.add(placeBuilding(building, far.frontX, (block.fromZ + block.toZ) / 2, Math.PI));
        made.farSide.push(building);
    });

    // back row
    const back = Buildings.backRow;
    back.blocks.forEach((block) => {
        const building = createBuilding({
            depth: back.depth, length: block.toX - block.fromX, height: block.height,
            color: block.color, kind: 'plain',
        });
        buildings.add(placeBuilding(building, (block.fromX + block.toX) / 2, back.frontZ, Math.PI / 2));
        made.backRow.push(building);
    });

    // water towers
    Buildings.waterTowers.forEach(({ side, index }) => {
        const building = made[side][index];
        if (!building) return;
        const roof = building.userData.roof.clone().applyMatrix4(building.matrix);
        buildings.add(createWaterTower(roof));
    });

    return buildings;
};
