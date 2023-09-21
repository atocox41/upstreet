import {
  aiProxyHost,
} from './endpoints.js';

//

export const generateImage = async ({
  prompt,
  negativePrompt,
}) => {
  const j = {
    prompt,
    negative_prompt: negativePrompt,
  };

  const numRetries = 3;
  for (let i = 0; i < numRetries; i++) {
    const res = await fetch(`https://${aiProxyHost}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(j),
    });
    if (res.ok) {
      const json = await res.json();
      const {
        images,
      } = json;
      const imageBase64 = images[0];
      const dataUrl = `data:image/png;base64,${imageBase64}`;

      const res2 = await fetch(dataUrl);
      const blob = await res2.blob();
      return blob;
    } else {
      console.warn('failed to generate image, retrying', res, i);
      continue;
    }
  }
  throw new Error('failed to generate image after retries');
};

//

export const setSdModel = async (model) => {
  const j = {
    sd_model_checkpoint: model,
  };
  const res = await fetch(`https://${aiProxyHost}/sdapi/v1/options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(j),
  });
  if (res.ok) {
    // nothing
  } else {
    console.warn('invalid status code for setSdModel', res.status);
    throw new Error('invalid status code for setSdModel');
  }
};

//

export const interrogateDeepBooru = async (blob) => {
  const imageBase64 = await new Promise((accept, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      accept(fr.result);
    };
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

  const j = {
    image: imageBase64,
    model: 'deepdanbooru',
  };
  const res = await fetch(`https://${aiProxyHost}/sdapi/v1/interrogate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(j),
  });
  if (res.ok) {
    const j = await res.json();
    const {caption} = j;
    return caption;
  } else {
    console.warn('invalid status code for interrogateDeepBooru', res.status);
    throw new Error('invalid status code for interrogateDeepBooru');
  }
};

//

export const img2img = async ({
  prompt,
  negativePrompt,

  width,
  height,

  image,
  mask,
  controlnetImage,

  controlnetWeight = 1,

  seed,
  subseed,
  steps,
  cfg_scale,

  inpaint_full_res = 1, // ["Whole picture", "Only masked"]
  inpainting_fill = 1, // ['fill', 'original', 'latent noise', 'latent nothing']
  mask_blur_x = 0,
  mask_blur_y = 0,
}) => {
  const j = {
    prompt,
    negative_prompt: negativePrompt,

    width,
    height,

    init_images: [
      image,
    ],
    mask,

    seed,
    subseed,
    steps,
    // cfg_scale,

    mask_blur_x,
    mask_blur_y,

    inpaint_full_res,
    inpainting_fill,
  };
  if (controlnetImage) {
    j.alwayson_scripts = {
      "controlnet": {
        "args": [
          {
            "enabled": true,
            "module": "none",
            // "model": "canny",
            "model": "control_v11p_sd15_openpose [cab727d4]",
            "weight": controlnetWeight,
            // "image": self.read_image(),
            "image": controlnetImage,
            "resize_mode": 1,
            "lowvram": false,
            "processor_res": 512,
            "threshold_a": 64,
            "threshold_b": 64,
            "guidance_start": 0.0,
            "guidance_end": 1.0,
            "control_mode": 0,
            "pixel_perfect": false
          },
        ],
      },
    };
  }
  if (cfg_scale !== undefined) {
    j.cfg_scale = cfg_scale;
  }

  const numRetries = 3;
  for (let i = 0; i < numRetries; i++) {
    const res = await fetch(`https://${aiProxyHost}/sdapi/v1/img2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(j),
    });
    if (res.ok) {
      const json = await res.json();
      const {
        images,
      } = json;
      const imageBase64 = images[0];
      const dataUrl = `data:image/png;base64,${imageBase64}`;

      const res2 = await fetch(dataUrl);
      const blob = await res2.blob();
      return blob;
    } else {
      console.warn('failed to generate image, retrying', res, i);
      continue;
    }
  }
  throw new Error('failed to generate image after retries');
};

//

export const remBg = async (blob) => {
  const imageBase64 = await new Promise((accept, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      accept(fr.result);
    };
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

  const j = {
    input_image: imageBase64,
    model: 'u2net',
  };
  const res = await fetch(`https://${aiProxyHost}/rembg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(j),
  });
  if (res.ok) {
    const j = await res.json();
    const {image} = j;
    const dataUrl = `data:image/png;base64,${image}`;
    const res2 = await fetch(dataUrl);
    const blob2 = await res2.blob();
    return blob2;
  } else {
    console.warn('invalid status code for interrogateDeepBooru', res.status);
    throw new Error('invalid status code for interrogateDeepBooru');
  }
};