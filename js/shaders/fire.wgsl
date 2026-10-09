// Fire shader, ported from the Shadertoy version (fire.glsl).
// Rules for this file (fire.js cuts it into functions):
//   - only plain functions: no @fragment, struct or @binding
//   - each function starts at the beginning of a line with "fn "
//   - order: hash, noise, fire (each only uses the ones above it)



//make input look random (input has always the same output)
fn hash(p: vec2f) -> f32 {
    let q = 50.0 * fract(p * 0.3183099 + vec2f(0.71, 0.113));
    return -1.0 + 2.0 * fract(q.x * q.y * (q.x + q.y));
}

//takes value and converts it to a smooth random value between -1 and 1, based on the input value.
fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(hash(i + vec2f(0.0, 0.0)),
            hash(i + vec2f(1.0, 0.0)), u.x),
        mix(hash(i + vec2f(0.0, 1.0)),
            hash(i + vec2f(1.0, 1.0)), u.x), u.y);
}


// uv:   the cylinder's texture coordinate (x around, y from 0 at the bottom to 1 at the top)
// time: seconds
// heat: 0 = no fire, 1 = full fire
fn fire(uv: vec2f, time: f32, heat: f32) -> vec4f {

    // turns the 0..1 uv into the pixel-like values the shader was tuned for: bigger = wider / taller flame
    let flameWidth = 500.0;
    let flameHeight = 350.0;

    // mirrors x around the cylinder so there is no seam where the uv wraps
    let mirroredX = abs(uv.x * 2.0 - 1.0);
    let p = vec2f(mirroredX * flameWidth, uv.y * flameHeight);

    // var because x changes on the next line
    var uvBot = p / 335.5;
    uvBot.x *= 0.4;

    let noise1 = smoothstep(0.0, 5.0, noise(vec2f(p.x * 1.20, p.y - time * 555.0) / 66.0));
    let noise2 = smoothstep(-1.5, 2.2, noise(vec2f(p.x * 0.9 - 300.0, p.y - time * 222.0) / 33.0)) * 2.0;
    let noise3 = smoothstep(0.0, 1.6, noise(vec2f(p.x * 0.7 + 100.0, p.y - time * 150.0) / 55.0)) * 2.0;
    let noise4 = smoothstep(-0.4, 1.0, noise(vec2f(p.x * 0.5 + 50.0, p.y - time * 240.0) / 55.0));
    let noise5 = smoothstep(0.0, 0.8, noise(vec2f(p.x * 1.6 + 50.0, p.y - time * 222.0) / 99.0));
    let noise6 = smoothstep(0.0, 1.4, noise(vec2f(p.x + 200.0, p.y - time * 333.0) / 300.0)) * 4.0;

    // the original had the same sum twice
    let fieryNoise1 = (noise1 + noise2 + noise3 + noise4 + noise5 + noise6) / 44.0;
    let fieryNoise2 = (noise1 + noise2 + noise3 + noise4 + noise5 + noise6) / 44.0;

    let uvDistort1 = uvBot + fieryNoise1 * 3.72;
    let uvDistort2 = uvBot + fieryNoise2 * 6.72;

    let mask1 = smoothstep(0.2, 0.72, 1.0 - smoothstep(0.0, 1.0, uvDistort1.y));
    let mask2 = smoothstep(0.44, 0.66, 1.0 - smoothstep(0.0, 1.0, uvDistort2.y));
    let mask3 = mask1 - mask2;
    let mask4 = 1.0 - (mask3 + mask2);

    let colorBot = vec3f(0.88, 0.44, 0.1);
    let colorMid = vec3f(0.66, 0.14, 0.14);
    let color1 = (mix(colorBot, colorMid, mask3) - mask4) + mask2 * 0.9;

    // dark parts go below 0, so clamp: with additive blending black is see-through
    let color = max(color1, vec3f(0.0)) * heat;

    return vec4f(color, 1.0);
}
