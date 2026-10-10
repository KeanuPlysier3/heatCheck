// makes a renderer's drawing size match the size its canvas has on the page. returns true when it had to resize,
// so the caller can update its camera's aspect. used by the game loop and the menu loop
export function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;   // each renderer measures its own canvas (game or menu)
    const pixelRatio = window.devicePixelRatio;
    const width = Math.floor(canvas.clientWidth * pixelRatio);
    const height = Math.floor(canvas.clientHeight * pixelRatio);
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}
