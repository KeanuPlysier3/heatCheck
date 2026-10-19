import { wgslFn } from 'three/tsl';
import source from './visualiser.wgsl?raw';

// grab the three functions from the shader source, split on "fn " at the start of a line, in their order in the file
const [randFloatSource, randColorSource, visualiserSource] = source
    .split(/^(?=fn )/m)
    .filter((part) => part.startsWith('fn '));

const randFloatFn = wgslFn(randFloatSource);             
const randColorFn = wgslFn(randColorSource, [randFloatFn]); 

export const visualiserFn = wgslFn(visualiserSource, [randFloatFn, randColorFn]);
