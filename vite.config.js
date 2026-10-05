import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    base: './',
    resolve: {
        alias: {
            // send imports of '@mediapipe/pose' to our stand-in, see js/shims/mediapipe-pose.js
            '@mediapipe/pose': fileURLToPath(new URL('./js/shims/mediapipe-pose.js', import.meta.url)),
        },
    },
});
