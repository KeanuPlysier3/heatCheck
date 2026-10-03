// turns both the axes and the grid of one node on/off
// lil-gui makes a checkbox for a property that holds a boolean, so `visible` is a
// getter/setter: the gui reads and writes one property, the setter passes it on to both helpers

import * as THREE from 'three/webgpu';
export class AxisGridHelper {
    constructor(node, units = 10) {
        const axes = new THREE.AxesHelper(); // red = x, green = y, blue = z
        axes.material.depthTest = false; // draw even when inside or behind a sphere
        axes.renderOrder = 2; // after the grid
        node.add(axes); // as a child it shows the node's own local axes

        const grid = new THREE.GridHelper(units, units); // a grid of `units` size with `units` divisions, so 1 cell = 1 unit
        grid.material.depthTest = false;
        grid.renderOrder = 1; // after the spheres (default 0)
        node.add(grid);

        this.grid = grid;
        this.axes = axes;
        this.visible = false; // runs the setter below, so everything starts hidden
    }
    get visible() {
        return this._visible;
    }
    set visible(v) {
        this._visible = v;
        this.grid.visible = v;
        this.axes.visible = v;
    }
}