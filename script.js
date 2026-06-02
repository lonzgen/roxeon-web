// ===Distance=== //
function updateClocks() {
  const now = new Date();

  const gnyTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(now);

  const gnyDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    weekday: 'short', day: '2-digit', month: 'short'
  }).format(now);

  const witTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(now);

  const witDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    weekday: 'short', day: '2-digit', month: 'short'
  }).format(now);

  document.getElementById('gnyTime').textContent = gnyTime;
  document.getElementById('gnyDate').textContent = gnyDate;
  document.getElementById('witTime').textContent = witTime;
  document.getElementById('witDate').textContent = witDate;
}

updateClocks();
setInterval(updateClocks, 1000);


// =====================================================
//  MEMORIES  — data-driven + kalender (khusus foto) + add photo
// =====================================================
/*
  ┌─ CARA UPDATE MEMORIES ─────────────────────────────┐
  │ Cukup tambah / ubah baris di array `memories`.     │
  │   type    : 'photo' atau 'video'                   │
  │   src     : path file (foto .jpg/.png / video .mp4)│
  │   date    : 'YYYY-MM-DD'  ← wajib, biar kalender   │
  │             & filter tanggal jalan                 │
  │   caption : tulisan kecil di bawah momen           │
  │ Otomatis diurutkan dari tanggal terlama → terbaru. │
  └────────────────────────────────────────────────────┘
  (Tanggal & caption di bawah ini masih contoh — ganti
   sesuai momen aslinya ya 🤍)
*/

// ----- SUPABASE -----
const SUPABASE_URL = "https://wmppjqhmrvhkxlahejvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcHBqcWhtcnZoa3hsYWhlanZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTM3NTUsImV4cCI6MjA5NTc2OTc1NX0.UMRe-qXPB629mtW1Pju6PQ2Bf8ku6GwZDIR61Iq4QgM";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let memories = [];
let selectedMemoryFile = null;

// =====================================================
//  MEMORIES — SUPABASE
// =====================================================
(function initMemories() {
  const MONTHS_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const galleryEl = document.getElementById('memGallery');
  if (!galleryEl) return;

  const wrapEl = document.getElementById('memGalleryWrap');
  const emptyEl = document.getElementById('memEmpty');
  const countEl = document.getElementById('memCount');
  const resetBtn = document.getElementById('memReset');
  const calBtn = document.getElementById('memCalBtn');
  const calLabel = document.getElementById('memCalLabel');
  const calBox = document.getElementById('memCalendar');
  const calGrid = document.getElementById('calGrid');
  const calMonthLabel = document.getElementById('calMonthLabel');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const hintEl = document.getElementById('memHint');
  const scrollbar = document.getElementById('memScrollbar');
  const thumb = document.getElementById('memScrollThumb');

  const memPopup = document.getElementById('memPopup');
  const memUpload = document.getElementById('memPhotoUpload');
  const memPreview = document.getElementById('memPhotoPreview');
  const memDateEl = document.getElementById('memDate');
  const memCapEl = document.getElementById('memCaption');

  let selectedDate = null;
  let calRef = new Date();
  calRef = new Date(calRef.getFullYear(), calRef.getMonth(), 1);

  const memDateSet = () => new Set(memories.map(m => m.date));

  const parse = (ds) => {
    const [y, mo, d] = ds.split('-').map(Number);
    return new Date(y, mo - 1, d);
  };

  const fmtShort = (ds) => {
    const d = parse(ds);
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  };

  const fmtLong = (ds) => {
    const d = parse(ds);
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
  };

  const esc = (s) =>
    String(s || '').replace(/[&<>"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[c]));

  function visibleList() {
    const list = selectedDate
      ? memories.filter(m => m.date === selectedDate)
      : memories.slice();

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  const ADD_CARD_HTML = `
    <button class="mem-add-card" id="memAddCard" type="button">
      <span class="mem-add-icon">+</span>
      <span>add photo</span>
    </button>
  `;

  function renderGallery() {
    const list = visibleList();

    if (emptyEl) emptyEl.hidden = !!list.length;

    galleryEl.innerHTML = list.map(m => `
      <figure class="mem-card" data-date="${m.date}">
        <div class="mem-media">
          <img src="${esc(m.src)}" alt="${esc(m.caption || 'memory')}" loading="lazy">
          <span class="mem-date-tag">${fmtShort(m.date)}</span>
        </div>
        <figcaption class="mem-cap">${esc(m.caption)}</figcaption>
      </figure>
    `).join('') + ADD_CARD_HTML;

    const addCard = galleryEl.querySelector('#memAddCard');
    if (addCard) addCard.addEventListener('click', openMemPopup);

    if (countEl) countEl.textContent = `${list.length} momen`;

    galleryEl.scrollTo({ left: 0 });
    requestAnimationFrame(updateScrollUI);
  }

  function updateScrollUI() {
    if (!wrapEl || !scrollbar || !thumb) return;

    const max = galleryEl.scrollWidth - galleryEl.clientWidth;
    const hasOverflow = max > 4;

    scrollbar.style.display = hasOverflow ? 'block' : 'none';
    wrapEl.classList.toggle('can-scroll', hasOverflow);

    if (hintEl) hintEl.style.display = hasOverflow ? '' : 'none';

    wrapEl.classList.toggle('at-start', galleryEl.scrollLeft <= 4);
    wrapEl.classList.toggle('at-end', galleryEl.scrollLeft >= max - 4);

    if (!hasOverflow) return;

    const trackW = scrollbar.clientWidth;
    const thumbW = Math.max(36, trackW * (galleryEl.clientWidth / galleryEl.scrollWidth));
    const ratio = galleryEl.scrollLeft / max;

    thumb.style.width = thumbW + 'px';
    thumb.style.transform = `translateX(${ratio * (trackW - thumbW)}px)`;
  }

  galleryEl.addEventListener('scroll', () => {
    updateScrollUI();
    if (hintEl && galleryEl.scrollLeft > 10) hintEl.classList.add('hide');
  });

  window.addEventListener('resize', updateScrollUI);

  window.scrollGallery = function (dir) {
    const step = Math.max(200, galleryEl.clientWidth * 0.8);
    galleryEl.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  function renderCalendar() {
    if (!calGrid || !calMonthLabel) return;

    const y = calRef.getFullYear();
    const m = calRef.getMonth();

    calMonthLabel.textContent = `${MONTHS_ID[m]} ${y}`;

    const firstDay = new Date(y, m, 1).getDay();
    const daysIn = new Date(y, m + 1, 0).getDate();
    const dates = memDateSet();

    let html = '';

    for (let i = 0; i < firstDay; i++) {
      html += `<span class="cal-cell empty"></span>`;
    }

    for (let d = 1; d <= daysIn; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const has = dates.has(ds);
      const sel = selectedDate === ds;

      html += `
        <button type="button"
          class="cal-cell${has ? ' has-mem' : ''}${sel ? ' sel' : ''}"
          data-date="${ds}" ${has ? '' : 'disabled'}>
          ${d}
        </button>
      `;
    }

    calGrid.innerHTML = html;
  }

  function setFilter(ds) {
    selectedDate = ds;

    if (calLabel) calLabel.textContent = ds ? fmtLong(ds) : 'semua tanggal';
    if (resetBtn) resetBtn.hidden = !ds;

    if (ds) {
      const d = parse(ds);
      calRef = new Date(d.getFullYear(), d.getMonth(), 1);
    }

    renderCalendar();
    renderGallery();
  }

  if (calGrid) {
    calGrid.addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-cell.has-mem');
      if (!cell) return;

      setFilter(cell.dataset.date);

      if (calBox) calBox.hidden = true;
      if (calBtn) calBtn.classList.remove('open');
    });
  }

  if (calPrev) {
    calPrev.addEventListener('click', () => {
      calRef = new Date(calRef.getFullYear(), calRef.getMonth() - 1, 1);
      renderCalendar();
    });
  }

  if (calNext) {
    calNext.addEventListener('click', () => {
      calRef = new Date(calRef.getFullYear(), calRef.getMonth() + 1, 1);
      renderCalendar();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => setFilter(null));
  }

  if (calBtn && calBox) {
    calBtn.addEventListener('click', () => {
      calBox.hidden = !calBox.hidden;
      calBtn.classList.toggle('open', !calBox.hidden);
    });
  }

  document.addEventListener('click', (e) => {
    if (
      calBox &&
      calBtn &&
      !calBox.hidden &&
      !calBox.contains(e.target) &&
      !calBtn.contains(e.target)
    ) {
      calBox.hidden = true;
      calBtn.classList.remove('open');
    }
  });

  function openMemPopup() {
    if (memPopup) memPopup.style.display = 'flex';
  }

  window.closeMemPopup = function () {
    if (memPopup) memPopup.style.display = 'none';
  };

  if (memUpload) {
    memUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      selectedMemoryFile = file;

      const previewUrl = URL.createObjectURL(file);
      memPreview.src = previewUrl;
      memPreview.style.display = 'block';
    });
  }

  async function loadMemoriesFromSupabase() {
    const { data, error } = await supabaseClient
      .from('memories')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Gagal mengambil memories:', error);
      alert('Gagal mengambil memories dari Supabase');
      return;
    }

    memories = data.map(item => ({
      type: 'photo',
      src: item.image_url,
      date: item.date,
      caption: item.caption || 'momen kita 🤍'
    }));

    if (memories.length) {
      const latestDate = memories.map(m => m.date).sort().slice(-1)[0];
      const d = parse(latestDate);
      calRef = new Date(d.getFullYear(), d.getMonth(), 1);
    }

    renderCalendar();
    renderGallery();
  }

  window.addMemory = async function () {
    const date = (memDateEl && memDateEl.value || '').trim();
    const caption = (memCapEl && memCapEl.value || '').trim();

    if (!selectedMemoryFile || !date) {
      alert('Pilih foto & tanggalnya dulu ya 🤍');
      return;
    }

    try {
      const fileExt = selectedMemoryFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `photos/${fileName}`;

      const { error: uploadError } = await supabaseClient
        .storage
        .from('memories')
        .upload(filePath, selectedMemoryFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Gagal upload foto ke Supabase');
        return;
      }

      const { data: publicUrlData } = supabaseClient
        .storage
        .from('memories')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabaseClient
        .from('memories')
        .insert({
          image_url: imageUrl,
          image_path: filePath,
          date: date,
          caption: caption || 'momen kita 🤍'
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        alert('Foto berhasil upload, tapi gagal simpan data ke database');
        return;
      }

      selectedMemoryFile = null;

      if (memUpload) memUpload.value = '';
      if (memCapEl) memCapEl.value = '';
      if (memDateEl) memDateEl.value = '';

      if (memPreview) {
        memPreview.src = '';
        memPreview.style.display = 'none';
      }

      window.closeMemPopup();

      await loadMemoriesFromSupabase();

      alert('Memory berhasil disimpan 🤍');
    } catch (err) {
      console.error(err);
      alert('Terjadi error saat menyimpan memory');
    }
  };

  if (memPopup) {
    memPopup.addEventListener('click', (e) => {
      if (e.target === memPopup) window.closeMemPopup();
    });
  }

  loadMemoriesFromSupabase();
})();



// ===== AUDIO PLAYER ===== //
const bgMusic   = document.getElementById('bgMusic');
const playBtn   = document.getElementById('playBtn');
const progFill  = document.querySelector('.progress-fill');
const timeSpans = document.querySelectorAll('.time-row span');

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

bgMusic.addEventListener('timeupdate', () => {
  const pct = (bgMusic.currentTime / bgMusic.duration) * 100 || 0;
  progFill.style.width = pct + '%';
  if (timeSpans[0]) timeSpans[0].textContent = formatTime(bgMusic.currentTime);
  if (timeSpans[1]) timeSpans[1].textContent = formatTime(bgMusic.duration);
});

document.querySelector('.progress-bar').addEventListener('click', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  bgMusic.currentTime = ((e.clientX - rect.left) / rect.width) * bgMusic.duration;
});

function togglePlay() {
  if (bgMusic.paused) { bgMusic.play(); playBtn.textContent = '⏸'; }
  else { bgMusic.pause(); playBtn.textContent = '▶'; }
}


// ===== WELCOME OVERLAY — klik sekali langsung musik jalan ===== //
const overlay = document.createElement('div');
overlay.id = 'welcomeOverlay';
overlay.innerHTML = `
  <div class="welcome-box">
    <p class="welcome-tag">for you 🤍</p>
    <h1 class="welcome-title">Hi Ocan</h1>
    <p class="welcome-sub">klik untuk masuk ke dunia kita ✨</p>
    <button class="welcome-btn">✦ open ✦</button>
  </div>
`;
overlay.style.cssText = `
  position: fixed; inset: 0; z-index: 99999;
  background: #FFF0F3;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Nunito', sans-serif;
  transition: opacity 0.6s ease;
`;
overlay.querySelector('.welcome-box').style.cssText = `
  text-align: center; padding: 40px;
`;
overlay.querySelector('.welcome-tag').style.cssText = `
  font-family: 'Caveat', cursive; font-size: 20px;
  color: #f472b6; margin-bottom: 8px;
`;
overlay.querySelector('.welcome-title').style.cssText = `
  font-family: 'Caveat', cursive; font-size: 72px;
  font-weight: 700; color: #3D1A1A; line-height: 1; margin-bottom: 12px;
`;
overlay.querySelector('.welcome-sub').style.cssText = `
  font-size: 15px; color: #7C3D52; margin-bottom: 32px;
`;
overlay.querySelector('.welcome-btn').style.cssText = `
  background: linear-gradient(135deg, #f472b6, #e85d8a);
  color: white; border: none; padding: 14px 36px;
  border-radius: 50px; font-size: 16px; font-weight: 700;
  font-family: 'Nunito', sans-serif; cursor: pointer;
  letter-spacing: 2px;
`;

document.body.appendChild(overlay);

overlay.querySelector('.welcome-btn').addEventListener('click', () => {
  bgMusic.play();
  playBtn.textContent = '⏸';
  overlay.style.opacity = '0';
  setTimeout(() => overlay.remove(), 600);
});


// ===== FADE-UP ANIMATIONS ===== //
const obs = new IntersectionObserver(
  (entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  },
  { threshold: 0.15, root: document.getElementById('siteWrap') }
);

document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));

setTimeout(() => {
  document.querySelector('.hero-left').classList.add('visible');
  document.querySelector('.hero-right').classList.add('visible');
}, 100);


// ===== JOURNEY — SUPABASE (TIMELINE) ===== //

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_FULL  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DOW          = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

let allJourneys = [];          // semua data dari Supabase
let currentYear = new Date().getFullYear();
let calYear = currentYear, calMonth = new Date().getMonth();

let selectedJourneyPhoto = null;
let selectedJourneyVideo = null;

// ---------- HELPERS ----------
function pad(n){ return String(n).padStart(2, '0'); }
// journey_date dari Supabase berformat "YYYY-MM-DD" (tipe DATE)
function parseISO(iso){ const [y,m,d] = String(iso).split('-').map(Number); return { y, m: m-1, d }; }
function fmtDate(iso){ const {m,d} = parseISO(iso); return { day: d, mon: MONTHS_SHORT[m] }; }

// notifikasi cantik (pengganti alert)
function showToast(message, emoji = '♡', type = '') {
  let wrap = document.getElementById('toastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toastWrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.innerHTML = `<span class="toast-emoji">${emoji}</span><span>${message}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 3400);
}

// ---------- LOAD DARI SUPABASE ----------
async function loadJourneysFromSupabase() {
  const { data, error } = await supabaseClient
  
    .from('journeys')
    .select('*')
    .order('journey_date', { ascending: true });   // urut berdasarkan TANGGAL

  if (error) {
    console.error('Gagal mengambil journeys:', error);
    showToast('Aduh, journey kita gagal dimuat. Coba lagi ya sayang ♡', '😢');
    return;
  }

  allJourneys = data || [];

  // set tahun aktif ke tahun data terbaru (kalau ada)
  // selalu mulai dari tahun TERLAMA yang ada isinya
  const years = yearsAvailable();
  if (years.length) currentYear = years[0];

  renderTimeline();
}

function yearsAvailable() {
  const set = new Set(allJourneys.map(j => parseISO(j.journey_date).y));
  return [...set].sort((a,b) => a-b);
}

// ---------- RENDER TIMELINE ----------
function renderTimeline() {
  const tl = document.getElementById('timeline');
  document.getElementById('yearLabel').textContent = currentYear;

  const items = allJourneys
    .filter(j => parseISO(j.journey_date).y === currentYear)
    .sort((a,b) => String(a.journey_date).localeCompare(String(b.journey_date)));

  tl.innerHTML = '';

  if (!items.length) {
    tl.innerHTML = '<div class="timeline-empty">Belum ada journey di tahun ini ♡</div>';
    buildMonthChips([]);
    updateScrollBar();
    return;
  }

  let lastMonth = -1;
  const monthsWithData = new Set();

  items.forEach(item => {
    const { m } = parseISO(item.journey_date);
    monthsWithData.add(m);

    if (m !== lastMonth) {
      lastMonth = m;
      const div = document.createElement('div');
      div.className = 'month-divider';
      div.id = 'month-' + m;
      div.innerHTML = `<span>${MONTHS_FULL[m]} ${currentYear}</span>`;
      tl.appendChild(div);
    }

    tl.appendChild(buildCard(item));
  });

  buildMonthChips([...monthsWithData]);
  initJourneyVideos();
  updateScrollBar();
}

function buildCard(item) {
  const { day, mon } = fmtDate(item.journey_date);
  const isVideo = item.media_type === 'video';

  // batasi deskripsi max 200 karakter biar rapi
  const full = item.description || '';
  const desc = full.length > 200 ? full.slice(0, 200).trim() + '…' : full;

  const mediaEl = isVideo
    ? `<video src="${item.media_url}" muted loop playsinline preload="metadata"></video>
       <button class="card-play" type="button" aria-label="putar video">▶</button>`
    : `<img src="${item.media_url}" alt="${item.title}">`;

  const card = document.createElement('div');
  card.className = 'tl-item' + (isVideo ? ' is-video' : '');
  card.id = 'journey-' + item.id;
  card.innerHTML = `
    <div class="tl-date"><span class="d">${day}</span>${mon}</div>
    <div class="journey-card">
      <div class="card-media">
        ${mediaEl}
        <span class="card-badge">${item.badge || 'new ♡'}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${item.title}</div>
        <div class="card-loc">📍 ${item.location}</div>
        <div class="card-desc">${desc}</div>
      </div>
    </div>`;
  return card;
}


// ---------- CHIP BULAN ----------
function buildMonthChips(monthsWithData) {
  const wrap = document.getElementById('monthChips');
  wrap.innerHTML = '';
  MONTHS_SHORT.forEach((name, idx) => {
    const has = monthsWithData.includes(idx);
    const chip = document.createElement('button');
    chip.className = 'month-chip' + (has ? '' : ' empty');
    chip.textContent = name;
    if (has) {
      chip.onclick = () => {
        document.querySelectorAll('.month-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const target = document.getElementById('month-' + idx);
        if (target) document.getElementById('timelineWrap').scrollTo({ top: target.offsetTop - 6, behavior: 'smooth' });
      };
    }
    wrap.appendChild(chip);
  });
}

// ---------- PROGRESS SCROLL ----------
function updateScrollBar() {
  const w = document.getElementById('timelineWrap');
  if (!w) return;
  const max = w.scrollHeight - w.clientHeight;
  const pct = max > 0 ? (w.scrollTop / max) * 100 : 0;
  document.getElementById('scrollBar').style.width = pct + '%';
}

// ---------- NAVIGASI TAHUN ----------
function bindYearNav() {
  document.getElementById('prevYear').onclick = () => { currentYear--; renderTimeline(); };
  document.getElementById('nextYear').onclick = () => { currentYear++; renderTimeline(); };
  document.getElementById('timelineWrap').addEventListener('scroll', updateScrollBar);
}

// ---------- KALENDER ----------
function openCalendar() {
  calYear = currentYear;
  const monthsThisYear = allJourneys
    .filter(j => parseISO(j.journey_date).y === calYear)
    .map(j => parseISO(j.journey_date).m);
  calMonth = monthsThisYear.length ? Math.min(...monthsThisYear) : new Date().getMonth();
  renderCalendar();
  document.getElementById('calendarPopup').style.display = 'flex';
}
function closeCalendar() { document.getElementById('calendarPopup').style.display = 'none'; }

// ambil grid kalender; kalau belum ada di HTML, dibuat otomatis di dalam popup
function getCalGrid() {
  let grid = document.getElementById('journeyCalGrid');
  if (!grid) {
    const card = document.querySelector('#calendarPopup .popup-card');
    if (!card) return null;
    grid = document.createElement('div');
    grid.id = 'journeyCalGrid';
    const legend = card.querySelector('.jcal-legend');
    legend ? card.insertBefore(grid, legend) : card.appendChild(grid);
  }
  grid.classList.add('jcal-grid');
  return grid;
}

function renderCalendar() {
  const titleEl = document.getElementById('calTitle');
  if (titleEl) titleEl.textContent = `${MONTHS_FULL[calMonth]} ${calYear}`;

  const grid = getCalGrid();
  if (!grid) return;
  grid.innerHTML = '';
  // style cadangan (jaga-jaga kalau CSS belum ke-load)
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.style.gap = '4px';

  DOW.forEach(d => {
    const el = document.createElement('div');
    el.className = 'jcal-dow';
    el.textContent = d;
    el.style.cssText = 'text-align:center;font-size:10px;font-weight:800;color:#e85d8a;padding:4px 0;';
    grid.appendChild(el);
  });

  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const dayMap = {};
  allJourneys.forEach(j => {
    const { y, m, d } = parseISO(j.journey_date);
    if (y === calYear && m === calMonth) dayMap[d] = j.id;
  });

  const cellBase = 'height:38px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border-radius:10px;position:relative;';

  for (let i = 0; i < firstDow; i++) {
    const b = document.createElement('div');
    b.className = 'jcal-cell blank';
    b.style.cssText = cellBase + 'visibility:hidden;';
    grid.appendChild(b);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'jcal-cell';
    cell.textContent = d;
    cell.style.cssText = cellBase + 'color:#7C3D52;';
    if (dayMap[d]) {
      cell.classList.add('has-journey');
      cell.style.background = 'linear-gradient(135deg, #f472b6, #e85d8a)';
      cell.style.color = '#fff';
      cell.style.cursor = 'pointer';
      const jid = dayMap[d];
      cell.onclick = () => jumpToJourney(jid);
    }
    grid.appendChild(cell);
  }
}

function jumpToJourney(id) {
  const item = allJourneys.find(j => String(j.id) === String(id));
  if (!item) return;
  const y = parseISO(item.journey_date).y;
  closeCalendar();
  if (y !== currentYear) { currentYear = y; renderTimeline(); }
  setTimeout(() => {
    const el = document.getElementById('journey-' + id);
    if (el) {
      document.getElementById('timelineWrap').scrollTo({ top: el.offsetTop - 40, behavior: 'smooth' });
      const card = el.querySelector('.journey-card');
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 1300);
    }
  }, 120);
}

// ---------- POPUP FORM ----------
const popup = document.getElementById('journeyPopup');

function closePopup() { popup.style.display = 'none'; }

function switchMediaTab(type) {
  const isPhoto = type === 'photo';
  document.getElementById('photoField').style.display = isPhoto ? 'block' : 'none';
  document.getElementById('videoField').style.display = isPhoto ? 'none' : 'block';
  document.getElementById('tabPhoto').classList.toggle('active', isPhoto);
  document.getElementById('tabVideo').classList.toggle('active', !isPhoto);
}

// ---------- PREVIEW FILE ----------
function bindUploadPreview() {
  const photoUpload = document.getElementById('photoUpload');
  const videoUpload = document.getElementById('videoUpload');

  if (photoUpload) {
    photoUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      selectedJourneyPhoto = file;
      selectedJourneyVideo = null;
      const preview = document.getElementById('photoPreview');
      preview.src = URL.createObjectURL(file);
      preview.style.display = 'block';
    });
  }

  if (videoUpload) {
    videoUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      selectedJourneyVideo = file;
      selectedJourneyPhoto = null;
      const url = URL.createObjectURL(file);

      const tempVid = document.createElement('video');
      tempVid.src = url;
      tempVid.onloadedmetadata = () => {
        if (tempVid.duration > 10) {
          showToast('Videonya kepanjangan, cinta. Cukup 5-10 detik aja ya biar pas ♡', '⏱️');
        }
        const preview = document.getElementById('videoPreview');
        preview.src = url;
        preview.style.display = 'block';
      };
    });
  }
}

// ---------- SIMPAN KE SUPABASE ----------
async function addJourney() {
  const title    = document.getElementById('journeyTitle').value.trim();
  const date     = document.getElementById('journeyDate').value;   // "YYYY-MM-DD" → cocok tipe DATE
  const location = document.getElementById('journeyLocation').value.trim();
  const desc     = document.getElementById('journeyDesc').value.trim();

  const isVideo      = document.getElementById('tabVideo').classList.contains('active');
  const selectedFile = isVideo ? selectedJourneyVideo : selectedJourneyPhoto;
  const mediaType    = isVideo ? 'video' : 'photo';
  const badgeInput   = document.getElementById('journeyBadge').value.trim();

  // ---- Validasi: semua field wajib diisi, pakai pesan manis ♡ ----
  if (!selectedFile) {
    return isVideo
      ? showToast('Videonya belum dipilih, cinta. Ayo abadikan momen kita ♡', '🎬')
      : showToast('Fotonya mana, sayang? Aku mau lihat senyummu di kenangan ini ♡', '📷');
  }
  if (isVideo && !badgeInput) {
    return showToast('Kasih badge spesial dulu ya, biar momen ini makin berkesan ✨', '🏷️');
  }
  if (!title) {
    return showToast('Kasih judul dulu ya sayang, biar kenangan ini punya nama ♡', '📖');
  }
  if (!date) {
    return showToast('Tanggalnya jangan lupa, cinta. Biar aku selalu ingat hari spesial kita 💕', '📅');
  }
  if (!location) {
    return showToast('Kita lagi di mana waktu itu, sayang? Isi lokasinya dulu yuk ♡', '📍');
  }
  if (!desc) {
    return showToast('Ceritain momennya dong, sayang. Aku mau baca kisah kita ♡', '✍️');
  }

  const badge = isVideo ? badgeInput : 'photo ♡';

  try {
    const fileExt  = selectedFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${mediaType}s/${fileName}`;

    const { error: uploadError } = await supabaseClient
      .storage.from('journeys')
      .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.error('Upload journey error:', uploadError);
      showToast('Filenya gagal diupload, sayang. Coba sekali lagi ya ♡', '😢');
      return;
    }

    const { data: publicUrlData } = supabaseClient
      .storage.from('journeys')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabaseClient
      .from('journeys')
      .insert({
        title: title,
        journey_date: date,            // string "YYYY-MM-DD" → tipe DATE
        location: location,
        description: desc,
        badge: badge,
        media_type: mediaType,
        media_url: publicUrlData.publicUrl,
        media_path: filePath
      });

    if (insertError) {
      console.error('Insert journey error:', insertError);
      showToast('Filenya masuk, tapi datanya gagal tersimpan. Coba lagi ya cinta ♡', '😢');
      return;
    }

    resetJourneyForm();
    closePopup();
    currentYear = parseISO(date).y;   // lompat ke tahun journey baru
    await loadJourneysFromSupabase();
    showToast('Yeay! Satu kenangan kita tersimpan selamanya ♡', '💖', 'success');

  } catch (err) {
    console.error(err);
    showToast('Ada yang error nih sayang, coba lagi sebentar ya ♡', '😢');
  }
}

// ---------- RESET FORM ----------
function resetJourneyForm() {
  selectedJourneyPhoto = null;
  selectedJourneyVideo = null;

  ['journeyTitle','journeyDate','journeyLocation','journeyDesc','journeyBadge']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  const photoUpload = document.getElementById('photoUpload');
  const videoUpload = document.getElementById('videoUpload');
  if (photoUpload) photoUpload.value = '';
  if (videoUpload) videoUpload.value = '';

  const photoPreview = document.getElementById('photoPreview');
  const videoPreview = document.getElementById('videoPreview');
  if (photoPreview) { photoPreview.src = ''; photoPreview.style.display = 'none'; }
  if (videoPreview) { videoPreview.src = ''; videoPreview.style.display = 'none'; }

  switchMediaTab('photo');
}

// ---------- VIDEO PLAY / PAUSE ----------
const journeyVideoObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.intersectionRatio < 0.4) {
      const v = e.target;
      if (!v.paused) v.pause();
      v.closest('.tl-item')?.classList.remove('playing');
    }
  });
}, { threshold: [0, 0.4, 0.75] });

function initJourneyVideos() {
  document.querySelectorAll('.tl-item.is-video').forEach(card => {
    const v = card.querySelector('video');
    if (!v || v.dataset.bound) return;

    v.dataset.bound = '1';
    journeyVideoObserver.observe(v);

    card.querySelector('.card-media').addEventListener('click', () => {
      if (v.paused) {
        document.querySelectorAll('.tl-item video').forEach(o => {
          if (o !== v) { o.pause(); o.closest('.tl-item')?.classList.remove('playing'); }
        });
        v.play();
      } else {
        v.pause();
      }
    });

    v.addEventListener('play',  () => card.classList.add('playing'));
    v.addEventListener('pause', () => card.classList.remove('playing'));
  });
}

// ---------- BIND TOMBOL & INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('openPopup').onclick   = () => popup.style.display = 'flex';
  document.getElementById('fabAdd').onclick       = () => popup.style.display = 'flex';
  document.getElementById('openCalendar').onclick = openCalendar;

  document.getElementById('journeyCalPrev').onclick = () => { calMonth--; if (calMonth < 0){ calMonth = 11; calYear--; } renderCalendar(); };
  document.getElementById('journeyCalNext').onclick = () => { calMonth++; if (calMonth > 11){ calMonth = 0; calYear++; } renderCalendar(); };

  popup.addEventListener('click', (e) => { if (e.target === popup) closePopup(); });
  document.getElementById('calendarPopup').addEventListener('click', (e) => {
    if (e.target.id === 'calendarPopup') closeCalendar();
  });

  bindYearNav();
  bindUploadPreview();
  loadJourneysFromSupabase();
});
