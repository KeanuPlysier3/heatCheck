import * as THREE from 'three/webgpu';
import { Buildings } from '../constants/buildings';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

// a colour from the palette as a css colour, which is what a canvas wants: 0x9a5b44 → '#9a5b44'
const css = (color) => '#' + color.toString(16).padStart(6, '0');

// a plain lit material, shared by everything of the same colour
const materials = new Map();
const plainMaterial = (color) => {
    if (!materials.has(color)) {
        materials.set(color, new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: SelfLight }));
    }
    return materials.get(color);
};

// a box with its outline as a child
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

    // a canvas measures y from the top, a building from the ground: this turns metres above the ground
    // into canvas pixels from the top
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
        // the front door at the top of the stoop, in the middle of the front
        const stoopTop = Buildings.brownstones.stoopSteps * Buildings.brownstones.stoopStepHeight;
        ctx.fillStyle = css(Colors.door);
        ctx.fillRect((length / 2 - 0.55) * ppm, fromGround(stoopTop + 2.1), 1.1 * ppm, 2.1 * ppm);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

// one building, built around its own origin: the middle of its front, at ground level. the front faces +x and the
// body goes backwards (towards -x). createBuildings() then moves and turns it into place, so the same code works
// for a building facing any way
const createBuilding = ({ depth, length, height, color, kind }) => {
    const building = new THREE.Object3D();

    // the front gets the painted canvas, the other five sides are plain wall. a box takes six materials in the
    // order +x, -x, +y, -y, +z, -z, and the front is +x
    const frontTexture = paintFront(length, height, color, kind);
    const frontMaterial = new THREE.MeshPhongMaterial({ map: frontTexture, emissive: 0xffffff, emissiveMap: frontTexture, emissiveIntensity: SelfLight });
    const wall = plainMaterial(color);

    const body = outlinedBox(depth, height, length, [frontMaterial, wall, wall, wall, wall, wall]);
    body.position.set(-depth / 2, Buildings.groundY + height / 2, 0);
    building.add(body);

    // cornice: a ledge along the top, sticking out a little over the front
    const cornice = outlinedBox(depth + Buildings.corniceOverhang, Buildings.corniceHeight, length + Buildings.corniceOverhang * 2, plainMaterial(Colors.cornice));
    cornice.position.set(-depth / 2 + Buildings.corniceOverhang / 2, Buildings.groundY + height + Buildings.corniceHeight / 2, 0);
    building.add(cornice);

    if (kind === 'brownstone') {
        // stoop: steps that get lower the further they are from the door, so the first one is the highest
        const stoop = Buildings.brownstones;
        for (let step = 0; step < stoop.stoopSteps; step++) {
            const stepHeight = (stoop.stoopSteps - step) * stoop.stoopStepHeight;
            const stepMesh = outlinedBox(stoop.stoopStepDepth, stepHeight, stoop.stoopWidth, plainMaterial(color));
            stepMesh.position.set(stoop.stoopStepDepth * (step + 0.5), Buildings.groundY + stepHeight / 2, 0);
            building.add(stepMesh);
        }
    }

    // the middle of the roof, in the building's own space. the water towers turn it into a world position
    building.userData.roof = new THREE.Vector3(-depth / 2, Buildings.groundY + height + Buildings.corniceHeight, 0);
    return building;
};

// puts a building in the world: the middle of its front at (x, z), turned around y by `turn`.
// turn 0 faces +x, Math.PI faces -x, Math.PI / 2 faces -z
const placeBuilding = (building, x, z, turn) => {
    building.position.set(x, 0, z);
    building.rotation.y = turn;
    building.updateMatrix(); // so the roof position below can be worked out right away
    return building;
};

// a wooden water tower on legs, standing on a roof
const createWaterTower = ({ x, y, z }) => {
    const tower = new THREE.Object3D();
    const { waterTowerRadius: radius, waterTowerHeight: height, waterTowerLegs: legs } = Buildings;
    const wood = plainMaterial(Colors.waterTower);

    // four legs at the corners of a square under the barrel
    const legOffset = radius * 0.6;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const leg = outlinedBox(0.12, legs, 0.12, plainMaterial(Colors.cornice));
        leg.position.set(sx * legOffset, legs / 2, sz * legOffset);
        tower.add(leg);
    });

    // the barrel and its pointed roof
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

    // the brownstone row: houses side by side along the street, each a random height. fronts face +x
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

    // across the street: three plain buildings. fronts face -x
    const far = Buildings.farSide;
    far.blocks.forEach((block) => {
        const building = createBuilding({
            depth: far.depth, length: block.toZ - block.fromZ, height: block.height,
            color: block.color, kind: 'plain',
        });
        buildings.add(placeBuilding(building, far.frontX, (block.fromZ + block.toZ) / 2, Math.PI));
        made.farSide.push(building);
    });

    // behind the cross street: a row along x. fronts face -z, back towards the court
    const back = Buildings.backRow;
    back.blocks.forEach((block) => {
        const building = createBuilding({
            depth: back.depth, length: block.toX - block.fromX, height: block.height,
            color: block.color, kind: 'plain',
        });
        buildings.add(placeBuilding(building, (block.fromX + block.toX) / 2, back.frontZ, Math.PI / 2));
        made.backRow.push(building);
    });

    // water towers on a few of the roofs: the roof's middle is turned from the building's own space into the world
    Buildings.waterTowers.forEach(({ side, index }) => {
        const building = made[side][index];
        if (!building) return;
        const roof = building.userData.roof.clone().applyMatrix4(building.matrix);
        buildings.add(createWaterTower(roof));
    });

    return buildings;
};
