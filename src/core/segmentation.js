// src/core/segmentation.js
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

let segmenterInstance = null;

function getSegmenter() {
  if (!segmenterInstance) {
    segmenterInstance = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    segmenterInstance.setOptions({ modelSelection: 1 });
  }
  return segmenterInstance;
}

export function extractSubject(imageObj) {
  const segmenter = getSegmenter();

  return new Promise((resolve) => {
    segmenter.onResults((results) => {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageObj.width;
      maskCanvas.height = imageObj.height;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.drawImage(results.segmentationMask, 0, 0, maskCanvas.width, maskCanvas.height);
      resolve(maskCanvas);
    });

    segmenter.send({ image: imageObj });
  });
}