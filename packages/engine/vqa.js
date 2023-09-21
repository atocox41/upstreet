import {
  aiProxyHost,
} from "./endpoints.js";

export const imageCaptioning = async (blob) => {
  // if (!blob) {
  //   throw new Error('no blob');
  // }

  const response = await fetch(`https://${aiProxyHost}/api/caption`, {
    method: 'POST',
    body: blob,
  });
  const text = await response.text();
  return text;
}

//

export const vqa = async (blob, prompt) => {
  // if (!blob) {
  //   throw new Error('no blob');
  // }

  const res = await fetch(`https://${aiProxyHost}/api/vqa`, {
    method: 'POST',
    body: blob,
    headers: {
      // 'X-Text': text,
      prompt,
    },
  });
  const answer = await res.text();
  return answer;
  // const result = await res.json();
  // const {
  //   answer,
  // } = result;
  // return answer;
};

//

export const imageSegmentation = async (blob) => {
  const fd = new FormData();
  fd.append('img_file', blob, 'image.jpg');

  const res = await fetch(`https://${aiProxyHost}/api/imageSegmentation/get_boxes`, {
    method: 'POST',
    body: fd,
  });
  const result = await res.json();
  return result;
};
export const imageSegmentationMulti = async ({
  blob,
  // imageBitmapPromise,
}) => {
  const [
    segmentationResult,
    imageBitmap,
  ] = await Promise.all([
    imageSegmentation(blob),
    createImageBitmap(blob),
    // imageBitmapPromise,
  ]);

  const getTopSegmentBoxes = segmentationResult => {
    const maxSegments = 3;
    return segmentationResult.sort((a, b) => {
      const [
        x1a,
        y1a,
        wa,
        ha,
      ] = a;
      const [
        x1b,
        y1b,
        wb,
        hb,
      ] = b;

      const aArea = wa * ha;
      const bArea = wb * hb;
      return bArea - aArea;
    }).slice(0, maxSegments);
  };
  const boxes = getTopSegmentBoxes(segmentationResult);

  const promises = [];
  const targetMaxSize = 512;
  for (let i = 0; i < boxes.length; i++) {
    const [
      x1,
      y1,
      w,
      h,
    ] = boxes[i];

    // compute resize height, maintaining aspect ratio
    let w2, h2;
    if (w > h) {
      w2 = targetMaxSize;
      h2 = targetMaxSize * h / w;
    } else {
      h2 = targetMaxSize;
      w2 = targetMaxSize * w / h;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w2;
    canvas.height = h2;
    const ctx = canvas.getContext('2d');
    // ctx.drawImage(tempCanvas, x1, y1, w, h, 0, 0, w2, h2);
    ctx.drawImage(imageBitmap, x1, y1, w, h, 0, 0, w2, h2);

    const p = (async () => {
      const blob = await new Promise((accept, reject) => {
        canvas.toBlob(accept);
      });

      // console.log('caption 1', blob);
      const label = await imageCaptioning(blob);

      // console.log('caption 2', {caption});
      const caption = {
        bbox: [
          x1,
          y1,
          w,
          h,
        ],
        label,
      };
      return caption;
    })();
    promises.push(p);

    // const p = createImageBitmap(tempCanvas, x1, y1, w, h, {
    //   resizeWidth: w2,
    //   resizeHeight: h2,
    // });
    // promises.push(p);
  }
  const segmentCaptions = await Promise.all(promises);
  return segmentCaptions;
};

//

export const imageSelection = async (
  blob, // Blob
  points, // [[x, y], ...]
  labels, // [[1], ...] of {0,1} of same length as points. 0 means background, 1 means foreground
  bbox, // [x1, y1, x2, y2]
) => {
  const fd = new FormData();
  fd.append('img_file', blob, blob.name ?? 'image.jpg');
  fd.append('points', JSON.stringify(points));
  fd.append('labels', JSON.stringify(labels));
  if (bbox) {
    fd.append('bbox', JSON.stringify(bbox));
  }

  const res = await fetch(`https://${aiProxyHost}/api/imageSegmentation/get_point_mask`, {
    method: 'POST',
    body: fd,
  });

  const dimsString = res.headers.get('X-Dims');

  const dimsJson = JSON.parse(dimsString);
  const bboxString = res.headers.get('X-Bbox');
  const bboxJson = JSON.parse(bboxString);
  const arrayBuffer = await res.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return {
    dims: dimsJson,
    bbox: bboxJson,
    uint8Array,
  };
};

export const imageFind = async (
  blob,
  prompt,
) => {
  const fd = new FormData();
  fd.append('input_image', blob, blob.name ?? 'image.jpg');
  fd.append('text_prompt', prompt);

  const res = await fetch(`https://${aiProxyHost}/api/gsa/gsa_main`, {
    method: 'POST',
    body: fd,
  });
  const j = await res.json();
  console.log('image find boxes', j);
  return j;

  /* const dimsString = res.headers.get('X-Dims');

  const dimsJson = JSON.parse(dimsString);
  const bboxString = res.headers.get('X-Bbox');
  const bboxJson = JSON.parse(bboxString);
  const arrayBuffer = await res.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return {
    dims: dimsJson,
    bbox: bboxJson,
    uint8Array,
  }; */
};