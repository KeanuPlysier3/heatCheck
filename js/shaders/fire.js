import { wgslFn } from 'three/tsl';
import source from './fire.wgsl?raw'; // ?raw makes Vite give us the file's text instead of running it


const [hashSource, noiseSource, fireSource] = source //grab the three functions from the shader source, splitting on "fn " in the correct order ofcourse 
    .split(/^(?=fn )/m)
    .filter((part) => part.startsWith('fn '));


const hashFn = wgslFn(hashSource); //-> let three this is a function 
const noiseFn = wgslFn(noiseSource, [hashFn]); //let three this is a function that uses hashFn as a dependency

// fireFn({ uv, time, heat }) is a node, use it as a colorNode
export const fireFn = wgslFn(fireSource, [noiseFn]);
