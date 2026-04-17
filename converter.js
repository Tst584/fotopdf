
/**
 *
 * @param {Array<{data: string, w: number, h: number}>} compressed
 * @param {{pageSize: string, orientation: string}} opts
 * @returns {Blob} PDF blob
 */
export function buildPDF(compressed, opts) {
  const { jsPDF } = window.jspdf;
  const { pageSize, orientation } = opts;

  let pdf = null;

  for (let i = 0; i < compressed.length; i++) {
    const { data, w, h } = compressed[i];

    let pageOrient = 'p';
    if (orientation === 'landscape') {
      pageOrient = 'l';
    } else if (orientation === 'portrait') {
      pageOrient = 'p';
    } else {
      pageOrient = (w / h) > 1 ? 'l' : 'p';
    }

    if (!pdf) {
      if (pageSize === 'fit') {
        pdf = new jsPDF({ orientation: pageOrient, unit: 'px', format: [w, h] });
      } else {
        pdf = new jsPDF({ orientation: pageOrient, unit: 'mm', format: pageSize });
      }
    } else {
      if (pageSize === 'fit') {
        pdf.addPage([w, h], pageOrient === 'l' ? 'landscape' : 'portrait');
      } else {
        pdf.addPage(pageSize, pageOrient === 'l' ? 'landscape' : 'portrait');
      }
    }

    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const scale = Math.min(pw / w, ph / h);
    const fw = w * scale;
    const fh = h * scale;
    const x  = (pw - fw) / 2;
    const y  = (ph - fh) / 2;

    pdf.addImage(data, 'JPEG', x, y, fw, fh, undefined, 'FAST');
  }

  return pdf ? pdf.output('blob') : new Blob([], { type: 'application/pdf' });
}
