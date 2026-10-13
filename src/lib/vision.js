// TensorFlow.js + MobileNet, loaded lazily so the rest of the site stays
// fast. All inference runs locally in the browser, so images never leave the
// device.

let modelPromise = null;

export function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      const mobilenet = await import('@tensorflow-models/mobilenet');
      await tf.ready();
      return mobilenet.load({ version: 2, alpha: 1.0 });
    })().catch((err) => {
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

export async function classify(source, topk = 5) {
  const model = await loadModel();
  return model.classify(source, topk);
}

// Draw a video frame, image or canvas onto a new canvas no larger than
// maxSide pixels, preserving aspect ratio.
export function toCanvas(source, maxSide = 480) {
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Crop a video frame to the square scan guide drawn over the preview. The
// preview is a 4:3 box with object-fit: cover, and the guide is a centered
// square GUIDE_FRACTION of the box height, so only what the user framed is
// classified and checked for contamination (not the wall or floor around it).
export const GUIDE_FRACTION = 0.7;

export function cropToGuide(video, maxSide = 480) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  // Visible region of the video inside the 4:3 preview.
  const visH = vw / vh > 4 / 3 ? vh : (vw * 3) / 4;
  const side = Math.round(visH * GUIDE_FRACTION);
  const sx = Math.round((vw - side) / 2);
  const sy = Math.round((vh - side) / 2);
  const out = Math.min(side, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  canvas.getContext('2d').drawImage(video, sx, sy, side, side, 0, 0, out, out);
  return canvas;
}

// JPEG data URL for sending a photo to the server's AI check. 1024px on the
// long side keeps uploads small while leaving enough detail to spot a bag
// or a grease stain.
export function toJpegDataUrl(canvas, maxSide = 1024, quality = 0.85) {
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
  if (scale === 1) return canvas.toDataURL('image/jpeg', quality);
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', quality);
}

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}
