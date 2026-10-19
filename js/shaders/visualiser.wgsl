// Equalizer bars for the boombox screen, ported from the Shadertoy version (visualisers.glsl).
// Rules for this file (visualisers.js cuts it into functions), the same as fire.wgsl:
//   - only plain functions: no @fragment, struct or @binding
//   - each function starts at the beginning of a line with "fn "
//   - order: randFloat, randColor, visualiser (each only uses the ones above it)



// a number between 0 and 1 that looks random, but is always the same for the same input
fn randFloat(x: f32) -> f32 {
    return fract(sin(x * 127.1) * 43758.5453123);
}

// a random colour for a bar: three random numbers, each built on the one before
fn randColor(x: f32) -> vec3f {
    var r = randFloat(x);
    var g = randFloat(x + r);
    var b = randFloat(x + r + g);

    // a completely black bar would be invisible on the black screen: make it light grey instead
    if (r == 0.0 && g == 0.0 && b == 0.0) {
        r = 0.8;
        g = 0.8;
        b = 0.8;
    }
    return vec3f(r, g, b);
}


// uv:   the screen plane's texture coordinate (0 to 1 in x and y)
// time: seconds
// on:   0 = screen off (black), 1 = bars playing
fn visualiser(uv: vec2f, time: f32, on: f32) -> vec4f {
    // Shadertoy works in pixels (fragCoord / iResolution); the plane's uv is that same 0..1 already.
    // move the middle to 0 and zoom out: the screen becomes a grid of 30 by 30 cells, from -15 to 15
    let grid = (uv - 0.5) * 30.0;

    let id = floor(grid);        // which cell: the column is id.x, the row is id.y
    let gv = fract(grid) - 0.5;  // where in that cell, from -0.5 to 0.5

    // every column bounces at its own speed, between 1 and 6
    let speed = randFloat(id.x + 2.0) * 5.0 + 1.0;
    let barHeight = sin(time * speed * 2.0) * 8.0;

    // GLSL leaves a variable that is never set at 0, WGSL wants a value: start black
    var col = vec3f(0.0);

    // a cell is lit when it is below the top of its column's bar
    if (id.y < barHeight) {
        col = randColor(id.x * randFloat(id.x));
    }

    // a thin black line on the right and top edge of every cell, so the bars look like LED blocks
    if (gv.x > 0.45 || gv.y > 0.45) {
        col = vec3f(0.0);
    }

    return vec4f(col * on, 1.0);
}
