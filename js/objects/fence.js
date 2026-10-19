import * as THREE from 'three/webgpu';
import { Fence } from '../constants/fence';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';


const createDiamondCanvas = () => {
    const canvas = document.createElement('canvas');//1 square diamond canvas.
    canvas.width = Fence.canvasSize;
    canvas.height = Fence.canvasSize;
    const ctx = canvas.getContext('2d');

    const s = Fence.canvasSize;
    ctx.strokeStyle = '#' + Colors.fenceWire.toString(16).padStart(6, '0'); //css color for canvas
    ctx.lineWidth = Fence.wireWidth;
    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s, s / 2);
    ctx.lineTo(s / 2, s);
    ctx.lineTo(0, s / 2);
    ctx.closePath();
    ctx.stroke();

    return canvas;
};

const diamondCanvas = createDiamondCanvas();

// wire mesh
const createMeshMaterial = (length, height) => {
    const texture = new THREE.CanvasTexture(diamondCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    // texture
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(length / Fence.diamondSize, height / Fence.diamondSize); // one diamond every diamondSize metres

    return new THREE.MeshBasicMaterial({
        map: texture,
        alphaTest: 0.5, // pixels less than half solid are not drawn at all: the holes in the fence
        side: THREE.DoubleSide, // visible from inside the court and from the street
    });
};

const metalMaterial = new THREE.MeshPhongMaterial({ color: Colors.fencePost, emissive: Colors.fencePost, emissiveIntensity: SelfLight });

// post
const createPost = (x, z, height) => {
    const postGeometry = new THREE.CylinderGeometry(Fence.postRadius, Fence.postRadius, height, 8);
    const postMesh = new THREE.Mesh(postGeometry, metalMaterial);
    postMesh.position.set(x, Fence.groundY + height / 2, z); // a cylinder is centred on its middle
    postMesh.add(createOutlineMesh(new THREE.CylinderGeometry(Fence.postRadius + Outline.thickness, Fence.postRadius + Outline.thickness, height + Outline.thickness * 2, 8)));
    return postMesh;
};


const createSide = (a, b, height) => {
    const side = new THREE.Object3D();

    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);

    // side angle
    const angle = Math.atan2(-dz, dx);
    const middle = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };


    const meshMesh = new THREE.Mesh(new THREE.PlaneGeometry(length, height), createMeshMaterial(length, height));
    meshMesh.position.set(middle.x, Fence.groundY + height / 2, middle.z);
    meshMesh.rotation.y = angle;
    side.add(meshMesh);

    // posts
    const gaps = Math.ceil(length / Fence.postSpacing);
    for (let i = 0; i <= gaps; i++) {
        const t = i / gaps; 
        side.add(createPost(a.x + dx * t, a.z + dz * t, height));
    }

    // top rail
    const railMesh = new THREE.Mesh(new THREE.CylinderGeometry(Fence.railRadius, Fence.railRadius, length, 8), metalMaterial);
    railMesh.position.set(middle.x, Fence.groundY + height, middle.z);
    railMesh.rotation.set(0, angle, Math.PI / 2);
    railMesh.add(createOutlineMesh(new THREE.CylinderGeometry(Fence.railRadius + Outline.thickness, Fence.railRadius + Outline.thickness, length + Outline.thickness * 2, 8)));
    side.add(railMesh);

    return side;
};

export const createFence = () => {
    const fence = new THREE.Object3D();
    const { minX, maxX, minZ, maxZ } = Fence;

    // corners
    const backLeft = { x: maxX, z: maxZ };
    const backRight = { x: minX, z: maxZ };
    const frontLeft = { x: maxX, z: minZ };
    const frontRight = { x: minX, z: minZ };

    fence.add(createSide(backRight, backLeft, Fence.backHeight)); // behind the hoop, the tall side
    // sides
    fence.add(createSide(frontRight, backRight, Fence.height)); // the -x side, towards the brownstones

    // street side with gate
    fence.add(createSide(frontLeft, { x: maxX, z: Fence.gateFromZ }, Fence.height));
    fence.add(createSide({ x: maxX, z: Fence.gateToZ }, backLeft, Fence.height));

    return fence;
};
