let qty = 1;
let basePrice = 0;

const rp = (n) => "Rp " + n.toLocaleString("id-ID");

function switchImg(el, src) {
  document.querySelectorAll(".thumb").forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  const img = document.getElementById("mainImg");
  img.style.opacity = "0";
  setTimeout(() => {
    img.src = src;
    img.style.opacity = "1";
  }, 200);
}

function selectOpt(el, g) {
  document.querySelectorAll(`.vopt:not(.disabled)`).forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
}

function selectColor(el) {
  document.querySelectorAll(".copt").forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
}

function changeQty(d) {
  const price = window.currentPrice || basePrice || 0;
  const maxStok = window.currentStok || 99;
  qty = Math.max(1, Math.min(maxStok, qty + d));
  document.getElementById("qtyNum").textContent = qty;
  if (price > 0) {
    document.getElementById("subtotalVal").textContent = rp(price * qty);
  }
}

let wished = false;

function toggleWish() {
  wished = !wished;
  const icon = document.getElementById("wishIcon");
  icon.className = wished ? "fa-solid fa-heart" : "fa-regular fa-heart";
  icon.style.color = wished ? "#E74C3C" : ""; // Diubah dikit biar merahnya pop di dark mode
  showToast(wished ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist");
}

async function addCart() {
  // AMAN: LOGIC BACKEND SAMA SEKALI TIDAK DISENTUH
  const user = JSON.parse(localStorage.getItem('lum_user') || 'null');
  if (!user) {
    showToast('Silakan masuk terlebih dahulu');
    setTimeout(() => window.location.href = 'lumiere-auth.html?tab=login', 1500);
    return;
  }

  const ukuran = document.querySelector('.vopt.active')?.textContent || '';
  const warna  = document.querySelector('.copt.active')?.style.background || '';

  const formData = new FormData();
  formData.append('action', 'tambah');
  formData.append('id_produk', window.currentIdProduk);
  formData.append('qty', qty);
  formData.append('ukuran', ukuran);
  formData.append('warna', warna);

  try {
    const res = await fetch('../backand/keranjang.php', { method: 'POST', body: formData });
    const data = await res.json();
    showToast(data.pesan || 'Ditambahkan ke keranjang');
  } catch(e) {
    showToast('Gagal menambahkan ke keranjang');
  }
}

// ── ULASAN DARI DATABASE ──
let allReviews = [];
let filterAktifReview = 'semua';

async function loadUlasan(id_produk) {
  // AMAN: LOGIC BACKEND FETCH ULASAN TIDAK DISENTUH
  try {
    const res  = await fetch(`../backand/ulasan.php?action=get&id_produk=${id_produk}`);
    const data = await res.json();
    if (data.status !== 'sukses') return;

    allReviews = data.data;
    const avg   = data.avg || 0;
    const total = data.total || 0;
    const dist  = data.dist || {5:0,4:0,3:0,2:0,1:0};

    // Update rating di atas (rating-row)
    const ratingRowEl = document.querySelector('.rating-num');
    if (ratingRowEl) ratingRowEl.textContent = avg + ' · ' + total + ' ulasan';

    // Update score
    document.getElementById('score-num').textContent  = avg || '-';
    document.getElementById('score-label').textContent = 'dari 5 · ' + total + ' ulasan';

    // Render bintang score
    const scoreStars = document.getElementById('score-stars');
    scoreStars.innerHTML = [1,2,3,4,5].map(i =>
      `<i class="${i <= Math.round(avg) ? 'fa-solid' : 'fa-regular'} fa-star"></i>`
    ).join('');

    // Render bar distribusi
    const barsEl = document.getElementById('review-bars');
    barsEl.innerHTML = [5,4,3,2,1].map(s => {
      const pct = total ? Math.round((dist[s]/total)*100) : 0;
      return `<div class="bar-row">
        <span class="bar-label">${s} ★</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-count">${dist[s]}</span>
      </div>`;
    }).join('');

    // Render filter pills
    const filtersEl = document.getElementById('review-filters');
    const denganKomentar = allReviews.filter(r => r.komentar && r.komentar.trim()).length;
    filtersEl.innerHTML = `
      <button class="rfil active" onclick="filterReview('semua',this)">Semua</button>
      ${[5,4,3,2,1].filter(s => dist[s] > 0).map(s =>
        `<button class="rfil" onclick="filterReview(${s},this)">${s} Bintang (${dist[s]})</button>`
      ).join('')}
      ${denganKomentar > 0 ? `<button class="rfil" onclick="filterReview('komentar',this)">Dengan Komentar (${denganKomentar})</button>` : ''}
    `;

    renderReviews();
  } catch(e) {
    console.error('Gagal load ulasan:', e);
  }
}

function renderReviews() {
  const listEl = document.getElementById('review-list');
  let filtered = allReviews;

  if (filterAktifReview === 'komentar') {
    filtered = allReviews.filter(r => r.komentar && r.komentar.trim());
  } else if (typeof filterAktifReview === 'number') {
    filtered = allReviews.filter(r => parseInt(r.rating) === filterAktifReview);
  }

  if (!filtered.length) {
    // PERUBAHAN VISUAL: warna var(--ink-soft) jadi var(--gray-light) biar kebaca
    listEl.innerHTML = '<p style="font-size:13px;color:var(--gray-light);padding:1rem 0;">Belum ada ulasan.</p>';
    return;
  }

  listEl.innerHTML = filtered.map((r, idx) => {
    const inisial = (r.nama_depan?.[0] || '') + (r.nama_belakang?.[0] || '');
    const nama    = (r.nama_depan?.[0] || '') + '***';
    const tgl     = new Date(r.dibuat).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    const stars   = [1,2,3,4,5].map(s =>
      `<i class="${s <= r.rating ? 'fa-solid' : 'fa-regular'} fa-star${s > r.rating ? ' off' : ''}"></i>`
    ).join('');

    return `
      <div class="review-item">
        <div class="review-head">
          <div class="reviewer-avatar">${inisial.toUpperCase()}</div>
          <div>
            <div class="reviewer-name">${nama}</div>
            <div class="reviewer-date">${tgl}</div>
            <div class="review-stars">${stars}</div>
          </div>
        </div>
        ${r.komentar ? `<p class="review-body">${r.komentar}</p>` : ''}
        <div class="review-helpful">
          <button class="helpful-btn" id="like${idx}" onclick="likeReview('like${idx}',this)">
            <i class="fa-regular fa-thumbs-up"></i> <span>0</span>
          </button>
          <span>Ulasan ini membantu?</span>
        </div>
      </div>
    `;
  }).join('');
}

function filterReview(val, el) {
  filterAktifReview = val;
  document.querySelectorAll('.rfil').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderReviews();
}

function setFilter(el) {
  document.querySelectorAll('.rfil').forEach(r => r.classList.remove('active'));
  el.classList.add('active');
}

const liked = {};

function likeReview(id, btn) {
  const span = btn.querySelector("span");
  const icon = btn.querySelector("i");
  const n = parseInt(span.textContent);
  if (liked[id]) {
    liked[id] = false;
    span.textContent = n - 1;
    icon.className = "fa-regular fa-thumbs-up";
    btn.classList.remove("liked");
  } else {
    liked[id] = true;
    span.textContent = n + 1;
    icon.className = "fa-solid fa-thumbs-up";
    btn.classList.add("liked");
  }
}

let toastTimer;

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// TAMBAHAN: ANIMASI PARTIKEL (Biar nyambung sama Home)
(function() {
  const bg = document.getElementById('bg');
  if (!bg) return;
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      bottom:-10px;
      opacity:0;
      animation-duration:${10 + Math.random()*15}s;
      animation-delay:${Math.random()*12}s;
    `;
    bg.appendChild(p);
  }
})();