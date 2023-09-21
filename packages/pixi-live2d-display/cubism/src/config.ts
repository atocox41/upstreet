export namespace CubismConfig {
  /**
   * Support 4x4 mask division, which is unofficial and experimental.
   * @see https://docs.live2d.com/cubism-sdk-manual/ow-sdk-mask-premake-web/?locale=en_us
   * @default true
   */
  export let supportMoreMaskDivisions = true;

  /**
   * Set opacity values directly from motion curves, instead of getting the values calculated by Pose.
   * This can prevent opacity values from being ignored when the model does not have a Pose.
   * @see https://github.com/guansss/CubismWebFramework/pull/1
   * @default false
   */
  export let setOpacityFromMotion = false;
}
