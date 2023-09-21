import imglyRemoveBackground from '@imgly/background-removal';

//

const options = {
  publicPath: '/onnx/',
};
export const removeBackground = async (img) => {
  return await imglyRemoveBackground(img, options);
};
export const removeBackgroundAll = async (img) => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  
  // let n = 0;

  // const seenPixel = new Set();
  // const getKey = (x, y) => `${x}:${y}`;
  // flood fill
  const _fill = (x, y) => {
      // const key = getKey(x, y);
      // if (!seenPixel.has(key)) {
      //   seenPixel.add(key);
        const r = imageData.data[(y * img.width + x) * 4 + 0];
        const g = imageData.data[(y * img.width + x) * 4 + 1];
        const b = imageData.data[(y * img.width + x) * 4 + 2];

        const delta = Math.abs(255 - r) + Math.abs(255 - g) + Math.abs(255 - b);
        // const deltaOffset = Math.min(32 - delta, 0);
        // const deltaFactor = deltaOffset / 32;
        if (delta < 48) {
          imageData.data[(y * img.width + x) * 4 + 3] = 0;
          // n++;

          // if (x > 0) {
          //   queue.push([x - 1, y]);
          // }
          // if (x < img.width - 1) {
          //   queue.push([x + 1, y]);
          // }
          // if (y > 0) {
          //   queue.push([x, y - 1]);
          // }
          // if (y < img.height - 1) {
          //   queue.push([x, y + 1]);
          // }
        }
  };
  for (let x = 0; x < img.width; x++) {
    for (let y = 0; y < img.height; y++) {
      _fill(x, y);
    }
  }
  // console.log('got n', n);

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise((accept, reject) => {
    canvas.toBlob(accept, 'image/png');
  });
  return blob;
};
export default removeBackground;