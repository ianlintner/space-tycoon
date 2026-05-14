// Shared resize helper for 3D view classes that own a WebGLRenderer +
// PerspectiveCamera pair which needs to stay in sync with the host canvas
// dimensions.
//
// The `updateStyle: false` flag on renderer.setSize is intentional — both
// view classes mirror the Phaser canvas's CSS size via syncCanvasPosition,
// and we don't want Three.js to fight that by writing canvas.style.width /
// canvas.style.height itself.

export interface ResizableRenderer {
  setSize(width: number, height: number, updateStyle?: boolean): void;
}

export interface ResizableCamera {
  aspect: number;
  updateProjectionMatrix(): void;
}

export function applyView3DResize(
  renderer: ResizableRenderer,
  camera: ResizableCamera,
  width: number,
  height: number,
): void {
  renderer.setSize(width, height, false);
  if (height > 0) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}
