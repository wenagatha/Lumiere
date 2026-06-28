const CART_PHP = '../backand/keranjang.php';

let cartItems = [];
let promoActive = false;

function fmt(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// ── FETCH KERANJANG DARI DATABASE ──
async function fetchCart() {
  try {
    const res = await fetch(CART_PHP + '?action=get');
    const data = await res.json();
    if (data.status === 'sukses') {
      cartItems = data.data;
      renderCart();
    }
  } catch(e) {
    console.error('Gagal fetch keranjang:', e);
  }
}

// ── RENDER CART (OPTIMASI STRUKTUR FRONTEND & ANIMASI) ──
function renderCart() {
  const container = document.querySelector('.cart-col');
  const emptyState = document.getElementById('emptyState');

  // Hapus item lama
  document.querySelectorAll('.cart-item').forEach(el => el.remove());

  if (!cartItems.length) {
    emptyState.style.display = 'flex';
    document.querySelector('.cart-header').style.display = 'none';
    document.querySelector('.promo-wrap').style.display = 'none';
    recalc();
    return;
  }

  emptyState.style.display = 'none';
  document.querySelector('.cart-header').style.display = 'flex';
  document.querySelector('.promo-wrap').style.display = 'block';

  const promoWrap = document.querySelector('.promo-wrap');

  // Menambahkan parameter 'i' untuk kalkulasi delay animasi masuk
  cartItems.forEach((item, i) => {
    const imgHtml = item.gambar
      ? `<img src="../uploads/produk/${item.gambar}" alt="${item.nama}" style="width:100%; height:100%; object-fit:cover;">`
      : `<i class="ti ti-shopping-bag" aria-hidden="true"></i>`;

    const origHtml = item.harga_lama
      ? `<div class="item-orig">${fmt(item.harga_lama)}</div>`
      : '';

    const varHtml = [
      item.ukuran, 
      item.warna ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${item.warna};vertical-align:middle;margin-left:4px;border:0.5px solid var(--border);"></span>` : ''
    ].filter(Boolean).join(' · ');

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.id = 'cart-row-' + item.id;
    
    // DESAIN: Menyuntikkan stagger delay agar item muncul berurutan secara estetik
    div.style.animationDelay = `${i * 0.06}s`;
    
    // PERBAIKAN: Membetulkan sintaksis id input menjadi id="q-${item.id}" agar tidak crash
    div.innerHTML = `
      <div class="item-img">${imgHtml}</div>
      <div class="item-body">
        <div class="item-cat">${item.kategori || ''}</div>
        <div class="item-name">${item.nama}</div>
        <div class="item-variant">Warna/Ukuran: ${varHtml}</div>
        <div class="item-actions">
          <button type="button" class="del-link" onclick="hapusItem(${item.id})" aria-label="Hapus produk">
            <i class="ti ti-trash" style="font-size:13px;" aria-hidden="true"></i>Hapus
          </button>
        </div>
      </div>
      <div class="item-right">
        <div style="text-align: right;">
          ${origHtml}
          <div class="item-price" style="color: var(--gold-light);">${fmt(item.harga)}</div>
          <div class="item-subtotal" id="sub-${item.id}">Subtotal: ${fmt(item.harga * item.qty)}</div>
        </div>
        <div class="qty-ctrl">
          <button type="button" class="qty-btn" onclick="updateQty(${item.id}, ${item.qty - 1})" aria-label="Kurangi jumlah">−</button>
          <input class="qty-num" id="q-${item.id}" type="text" value="${item.qty}" readonly aria-label="Jumlah item">
          <button type="button" class="qty-btn" onclick="updateQty(${item.id}, ${item.qty + 1})" aria-label="Tambah jumlah">+</button>
        </div>
      </div>
    `;
    container.insertBefore(div, promoWrap);
  });

  recalc();
}

// ── UPDATE QTY ──
async function updateQty(id, newQty) {
  const item = cartItems.find(i => i.id == id);
  if (!item) return;

  if (newQty > parseInt(item.stok)) {
    showToast('Stok tidak mencukupi');
    return;
  }

  const formData = new FormData();
  formData.append('action', 'update');
  formData.append('id', id);
  formData.append('qty', newQty);

  try {
    const res = await fetch(CART_PHP, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.status === 'sukses') {
      if (newQty <= 0) {
        cartItems = cartItems.filter(i => i.id != id);
        document.getElementById('cart-row-' + id)?.remove();
      } else {
        item.qty = newQty;
        document.getElementById('q-' + id).value = newQty;
        document.getElementById('sub-' + id).textContent = 'Subtotal: ' + fmt(item.harga * newQty);
      }
      recalc();
      checkEmpty();
    }
  } catch(e) {
    showToast('Gagal update keranjang');
  }
}

// ── HAPUS ITEM ──
async function hapusItem(id) {
  const el = document.getElementById('cart-row-' + id);
  if (el) el.classList.add('removing'); // Kelas transisi CSS dipicu di sini

  const formData = new FormData();
  formData.append('action', 'hapus');
  formData.append('id', id);

  try {
    const res = await fetch(CART_PHP, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.status === 'sukses') {
      cartItems = cartItems.filter(i => i.id != id);
      setTimeout(() => el?.remove(), 300); // Menunggu animasi transisi selesai baru dihapus dari DOM
      recalc();
      checkEmpty();
    }
  } catch(e) {
    showToast('Gagal menghapus item');
  }
}

// ── HAPUS SEMUA ──
async function clearAll() {
  const formData = new FormData();
  formData.append('action', 'clear');

  try {
    const res = await fetch(CART_PHP, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.status === 'sukses') {
      cartItems = [];
      renderCart();
    }
  } catch(e) {
    showToast('Gagal mengosongkan keranjang');
  }
}

// ── PROMO ──
function applyPromo() {
  const val = document.getElementById('promoInput').value.trim().toUpperCase();
  if (val === 'LUMIERE10') {
    promoActive = true;
    document.getElementById('promoApplied').style.display = 'flex';
    document.getElementById('promoRow').style.display = 'flex';
    document.getElementById('promoInput').value = '';
    recalc();
  } else {
    document.getElementById('promoInput').style.borderColor = 'var(--gold-light)';
    setTimeout(() => document.getElementById('promoInput').style.borderColor = '', 1500);
  }
}

function removePromo() {
  promoActive = false;
  document.getElementById('promoApplied').style.display = 'none';
  document.getElementById('promoRow').style.display = 'none';
  recalc();
}

// ── RECALC ──
function recalc() {
  let subtotal = 0, disc = 0, count = 0;

  cartItems.forEach(item => {
    const orig = item.harga_lama ? parseInt(item.harga_lama) : parseInt(item.harga);
    subtotal += orig * item.qty;
    disc     += (orig - parseInt(item.harga)) * item.qty;
    count    += item.qty;
  });

  const afterDisc = subtotal - disc;
  const promoAmt  = promoActive ? Math.round(afterDisc * 0.1) : 0;
  const total     = afterDisc - promoAmt;

  document.getElementById('cartCount').textContent = cartItems.length + ' item dalam keranjang';
  document.getElementById('cartBadge').textContent = count;
  document.getElementById('itemCount').textContent = count;
  document.getElementById('subtotalEl').textContent = fmt(subtotal);
  document.getElementById('itemDiscEl').textContent = disc > 0 ? '−' + fmt(disc) : fmt(0);
  document.getElementById('promoDiscEl').textContent = '−' + fmt(promoAmt);
  document.getElementById('totalEl').textContent = fmt(total);
}

// ── CHECK EMPTY ──
function checkEmpty() {
  if (!cartItems.length) {
    document.getElementById('emptyState').style.display = 'flex';
    document.querySelector('.cart-header').style.display = 'none';
    document.querySelector('.promo-wrap').style.display = 'none';
  }
}

// ── TOAST ──
let toastTimer;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── REKOMENDASI PRODUK ──
async function fetchRekomendasi() {
  try {
    const res = await fetch('../backand/produk-user.php?action=get');
    const data = await res.json();
    if (data.status !== 'sukses') return;

    const shuffled = data.data.sort(() => Math.random() - 0.5).slice(0, 4);

    const grid = document.querySelector('.rec-grid');
    grid.innerHTML = shuffled.map((p, i) => {
      const imgHtml = p.gambar
        ? `<img src="../uploads/produk/${p.gambar}" style="width:100%;height:100%;object-fit:cover;" alt="${p.nama}">`
        : `<i class="ti ti-shopping-bag" aria-hidden="true"></i>`;
      return `
        <div class="rec-card" style="animation-delay: ${i * 0.05}s;" onclick="window.location.href='lumiere_product_detail_v3.html?id=${p.id}'" role="button" tabindex="0">
          <div class="rec-img">${imgHtml}</div>
          <div class="rec-info">
            <div class="rec-cat">${p.kategori || ''}</div>
            <div class="rec-name">${p.nama}</div>
            <div class="rec-price" style="color: var(--gold-light);">Rp ${parseInt(p.harga).toLocaleString('id-ID')}</div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    console.error('Gagal fetch rekomendasi:', e);
  }
}

// ── INIT ──
fetchCart();
fetchRekomendasi();