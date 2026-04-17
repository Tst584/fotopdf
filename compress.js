
/**
 * @param {string} url      
 * @param {number} quality  
 * @param {number} maxWidth 
 * @returns {Promise<{data: string, w: number, h: number}>}
 */
export function compressImage(url, quality, maxWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (maxWidth > 0 && w > maxWidth) {
        h = Math.round(h * maxWidth / w);
        w = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const data = canvas.toDataURL('image/jpeg', quality);
      resolve({ data, w, h });
    };
    img.onerror = () => reject(new Error('Не вдалося завантажити зображення'));
    img.src = url;
  });
}

/**
 *
 * @param {Array<{url: string}>} images
 * @param {number} quality
 * @param {number} maxWidth
 * @param {function(number)} onProgress 
 * @returns {Promise<Array<{data, w, h}>>}
 */
export async function compressAll(images, quality, maxWidth, onProgress) {
  let done = 0;
  const tasks = images.map((img) =>
    compressImage(img.url, quality, maxWidth).then((result) => {
      done++;
      onProgress(done);
      return result;
    })
  );
  return Promise.all(tasks);
}
