
import { compressAll } from './compress.js';
import { buildPDF }    from './converter.js';


const images = [];        
let totalOriginalBytes = 0;

const dropzone     = document.getElementById('dropzone');
const fileInput    = document.getElementById('file-input');
const imgGrid      = document.getElementById('img-grid');
const previewSec   = document.getElementById('preview-section');
const convertArea  = document.getElementById('convert-area');
const btnConvert   = document.getElementById('btn-convert');
const progressWrap = document.getElementById('progress-wrap');
const progressFill = document.getElementById('progress-fill');
const progressLbl  = document.getElementById('progress-label');
const phaseCompress= document.getElementById('phase-compress');
const phasePdf     = document.getElementById('phase-pdf');
const successBox   = document.getElementById('success-box');
const downloadLink = document.getElementById('download-link');
const countBadge   = document.getElementById('count-badge');
const qualityInput = document.getElementById('quality');
const qualityVal   = document.getElementById('quality-val');


qualityInput.addEventListener('input', () => {
  qualityVal.textContent = qualityInput.value + '%';
});


dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

dropzone.addEventListener('click', e => {
  if (e.target === dropzone || e.target.closest('.drop-icon, .drop-title, .drop-sub')) {
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => handleFiles(fileInput.files));


function handleFiles(files) {
  Array.from(files).forEach(f => {
    if (!f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f);
    images.push({ file: f, url, size: f.size });
    totalOriginalBytes += f.size;
    renderThumb(images.length - 1, url);
  });
  fileInput.value = '';
  updateUI();
}

function renderThumb(idx, url) {
  const div = document.createElement('div');
  div.className = 'img-thumb';
  div.dataset.idx = idx;
  div.innerHTML = `
    <img src="${url}" loading="lazy">
    <button class="remove-btn" data-remove="${idx}">✕</button>
    <span class="num">${idx + 1}</span>
    <div class="compress-status">⚙️</div>
  `;
  div.querySelector('.remove-btn').addEventListener('click', () => removeImage(idx));
  imgGrid.appendChild(div);
}

function removeImage(idx) {
  totalOriginalBytes -= images[idx].size;
  URL.revokeObjectURL(images[idx].url);
  images.splice(idx, 1);
  // Перерендер
  imgGrid.innerHTML = '';
  images.forEach((img, i) => renderThumb(i, img.url));
  updateUI();
}

document.getElementById('btn-clear-all').addEventListener('click', () => {
  images.forEach(img => URL.revokeObjectURL(img.url));
  images.length = 0;
  totalOriginalBytes = 0;
  imgGrid.innerHTML = '';
  successBox.style.display = 'none';
  updateUI();
});

document.getElementById('btn-new').addEventListener('click', () => {
  successBox.style.display = 'none';
  document.getElementById('stat-pdf').textContent   = '—';
  document.getElementById('stat-ratio').textContent = '—';
});


function updateUI() {
  const n = images.length;
  countBadge.textContent = n + ' фото';
  previewSec.style.display  = n > 0 ? 'block' : 'none';
  convertArea.style.display = n > 0 ? 'block' : 'none';
  document.getElementById('stat-count').textContent = n;
  document.getElementById('stat-size').textContent  = formatBytes(totalOriginalBytes);
}

function formatBytes(b) {
  if (b < 1024)    return b + ' Б';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' КБ';
  return (b / 1048576).toFixed(2) + ' МБ';
}


btnConvert.addEventListener('click', convertToPDF);

async function convertToPDF() {
  if (images.length === 0) return;

  const quality   = parseInt(qualityInput.value) / 100;
  const pageSize  = document.getElementById('page-size').value;
  const orient    = document.getElementById('orientation').value;
  const maxW      = parseInt(document.getElementById('max-width').value);
  const total     = images.length;

  btnConvert.disabled = true;
  progressWrap.style.display = 'block';
  successBox.style.display   = 'none';
  setPhase('compress');


  let doneCount = 0;

  progressLbl.textContent   = `Стиснення: 0 / ${total}...`;
  progressFill.style.width  = '0%';

  const compressed = await compressAll(
    images,
    quality,
    maxW,
    (n) => {
      doneCount = n;
      const pct = Math.round((n / total) * 80); 
      progressFill.style.width  = pct + '%';
      progressLbl.textContent   = `Стиснення: ${n} / ${total}...`;

      const thumb = imgGrid.querySelector(`[data-idx="${n - 1}"]`);
      if (thumb) thumb.classList.add('done');
    }
  );

  setPhase('pdf');
  progressLbl.textContent  = 'Генерація PDF...';
  progressFill.style.width = '85%';

  await new Promise(r => requestAnimationFrame(r));

  const pdfBlob = buildPDF(compressed, { pageSize, orientation: orient });

  progressFill.style.width = '100%';
  progressLbl.textContent  = 'Готово!';

  const pdfUrl  = URL.createObjectURL(pdfBlob);
  downloadLink.href     = pdfUrl;
  downloadLink.download = 'fotopdf_' + Date.now() + '.pdf';

  const pdfBytes = pdfBlob.size;
  const ratio    = totalOriginalBytes > 0
    ? Math.round((1 - pdfBytes / totalOriginalBytes) * 100)
    : 0;

  document.getElementById('stat-pdf').textContent   = formatBytes(pdfBytes);
  document.getElementById('stat-ratio').textContent = Math.max(0, ratio) + '%';
  document.getElementById('success-info').textContent =
    `${total} фото → ${formatBytes(pdfBytes)} PDF (стиснення: ${Math.max(0, ratio)}%)`;

  await new Promise(r => setTimeout(r, 300));
  progressWrap.style.display = 'none';
  successBox.style.display   = 'block';
  btnConvert.disabled        = false;

  downloadLink.click();
}

function setPhase(phase) {
  phaseCompress.classList.toggle('active', phase === 'compress');
  phasePdf.classList.toggle('active',      phase === 'pdf');
}
