
// DATA PRODUK
let PRODUCTS = [];

async function fetchProducts() {
  try {
    const res = await fetch('../backand/produk-user.php?action=get');
    const data = await res.json();
    if (data.status === 'sukses') {
      PRODUCTS = data.data.map(p => ({
        id: String(p.id),
        name: p.nama,
        cat: p.kategori,
        price: parseInt(p.harga),
        oldPrice: p.harga_lama ? parseInt(p.harga_lama) : null,
        badge: p.harga_lama ? 'sale' : null,
        location: 'Jakarta',
        rating: 5,
        sold: parseInt(p.terjual) || 0,
        img: p.gambar ? '../uploads/produk/' + p.gambar : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
        stok: parseInt(p.stok)
      }));
      buildCats();
      renderProducts();
    }
  } catch(e) {
    console.error('Gagal fetch produk:', e);
  }
}

const BADGE_MAP = {
  new:  { label: 'Baru', cls: 'badge-new' },
  sale: { label: 'Sale', cls: 'badge-sale' },
  off:  { label: 'Diskon', cls: 'badge-off' },
};

// STATE
let cart      = JSON.parse(localStorage.getItem('lum_cart') || '[]');
let wishlist  = JSON.parse(localStorage.getItem('lum_wish') || '[]');
let currentCat = 'Semua';
let searchQ   = '';

// FORMAT HELPERS
const rp = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const stars = r => Array.from({length:5}, (_,i) => `<i class="fa-solid fa-star ${i < r ? 'on' : ''}"></i>`).join('');

// AUTH STATE
function initAuth() {
  const user = JSON.parse(localStorage.getItem('lum_user') || 'null');
  if (user) {
    document.getElementById('guestMenu').style.display = 'none';
    document.getElementById('loggedMenu').style.display = 'block';
    if (user.role === 'admin') document.getElementById('adminLink').style.display = 'block';

    const userBtn = document.getElementById('userBtn');
    if (user.foto) {
      userBtn.innerHTML = `
        <img src="../uploads/user/${user.foto}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">
        <span style="font-size:12px;font-weight:500;color:#2C2A26;margin-left:6px;">${user.nama}</span>
      `;
    } else {
      userBtn.innerHTML = `
        <div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:#2C2A26;color:#F5F2EC;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${user.nama.charAt(0).toUpperCase()}</div>
        <span style="font-size:12px;font-weight:500;color:#2C2A26;margin-left:6px;">${user.nama}</span>
      `;
    }
  }
}

async function logout() {
  await fetch('../backand/logout.php');
  localStorage.removeItem('lum_user');
  location.reload();
}

function goDetail(id) {
  window.location.href = 'lumiere_product_detail_v3.html?id=' + id;
}

// KATEGORI
function buildCats() {
  const cats = ['Semua', ...new Set(PRODUCTS.map(p => p.cat))];
  const strip = document.getElementById('catStrip');
  strip.innerHTML = cats.map(c => `<button class="cat-pill ${c === currentCat ? 'active' : ''}" onclick="filterCat('${c}')">${c}</button>`).join('');
}

function filterCat(cat) {
  currentCat = cat;
  document.getElementById('searchInput').value = '';
  searchQ = '';
  buildCats();
  renderProducts();
  document.getElementById('produk').scrollIntoView({ behavior: 'smooth' });
}

function filterProducts() {
  searchQ = document.getElementById('searchInput').value.toLowerCase();
  currentCat = 'Semua';
  buildCats();
  renderProducts();
}

// RENDER PRODUK
function renderProducts() {
  const filtered = PRODUCTS.filter(p => {
    const matchCat  = currentCat === 'Semua' || p.cat === currentCat;
    const matchQ    = p.name.toLowerCase().includes(searchQ) || p.cat.toLowerCase().includes(searchQ);
    return matchCat && matchQ;
  });

  const grid = document.getElementById('prodGrid');

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-regular fa-face-meh"></i><p>Produk tidak ditemukan.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const badge = p.badge ? `<div class="prod-badge ${BADGE_MAP[p.badge].cls}">${BADGE_MAP[p.badge].label}</div>` : '';
    const oldPrice = p.oldPrice ? `<span class="prod-old">${rp(p.oldPrice)}</span>` : '';
    const wished = wishlist.includes(p.id);
    return `
      <div class="prod-card" style="animation-delay:${i * 0.06}s; cursor:pointer" onclick="goDetail('${p.id}')">
        <div class="prod-img-wrap">
          ${badge}
          <button class="prod-wish ${wished ? 'active' : ''}" onclick="toggleWishItem('${p.id}',event)" title="Wishlist">
            <i class="fa-${wished ? 'solid' : 'regular'} fa-heart"></i>
          </button>
          <img src="${p.img}" alt="${p.name}" loading="lazy">
          <button class="prod-cart-btn" onclick="addToCart('${p.id}');event.stopPropagation()">
            <i class="fa-solid fa-bag-shopping"></i> Tambah
          </button>
        </div>
        <div class="prod-info">
          <div class="prod-cat">${p.cat}</div>
          <div class="prod-name">${p.name}</div>
          <div class="prod-price-row">
            <span class="prod-price">${rp(p.price)}</span>
            ${oldPrice}
          </div>
          <div class="prod-meta">
            <span>${p.sold} terjual</span>
            <span class="stars">${stars(p.rating)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// CART
function saveCart() {
  localStorage.setItem('lum_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cartBadge');
  badge.style.display = total > 0 ? 'flex' : 'none';
  badge.textContent = total > 99 ? '99+' : total;
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name: product.name, price: product.price, img: product.img, qty: 1 });
  }
  saveCart();
  showToast(`${product.name} ditambahkan ke keranjang`);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function openCart()  { document.getElementById('cartDrawer').classList.add('open'); document.getElementById('drawerOverlay').classList.add('open'); renderCart(); }
function closeCart() { document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('drawerOverlay').classList.remove('open'); }

function renderCart() {
  const el = document.getElementById('drawerItems');
  const footer = document.getElementById('drawerFooter');

  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty"><i class="fa-regular fa-bag-shopping"></i><p>Keranjangmu masih kosong.</p></div>`;
    footer.style.display = 'none';
    return;
  }

  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.img}" alt="${item.name}" loading="lazy">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${rp(item.price)}</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${item.id}',-1)"><i class="fa-solid fa-minus"></i></button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}',1)"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
      <button class="cart-remove" onclick="removeFromCart('${item.id}')"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('');

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cartTotal').textContent = rp(total);
  footer.style.display = 'block';
}

function goCheckout() {
  const user = JSON.parse(localStorage.getItem('lum_user') || 'null');
  if (!user) { showToast('Silakan masuk terlebih dahulu'); setTimeout(() => { window.location.href='login.html'; }, 1200); return; }
  window.location.href = 'checkout.html';
}

// WISHLIST
async function loadWishlistIds() {
  const user = JSON.parse(localStorage.getItem('lum_user') || 'null');
  if (!user) return;
  try {
    const res  = await fetch('../backand/wishlist.php?action=get');
    const data = await res.json();
    if (data.status === 'sukses') {
      wishlist = data.data.map(w => String(w.id_produk));
      renderProducts();
    }
  } catch(e) {
    console.error('Gagal load wishlist:', e);
  }
}

async function toggleWishItem(id, e) {
  e.stopPropagation();
  const user = JSON.parse(localStorage.getItem('lum_user') || 'null');
  if (!user) {
    showToast('Silakan masuk untuk menyimpan wishlist');
    return;
  }

  const fd = new FormData();
  fd.append('action', 'toggle');
  fd.append('id_produk', id);

  try {
    const res  = await fetch('../backand/wishlist.php', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.status === 'sukses') {
      if (data.aksi === 'ditambah') {
        wishlist.push(String(id));
        showToast('Ditambahkan ke wishlist');
      } else {
        wishlist = wishlist.filter(w => w !== String(id));
        showToast('Dihapus dari wishlist');
      }
      renderProducts();
    }
  } catch(e) {
    showToast('Gagal update wishlist');
  }
}

// TOAST
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// INIT
initAuth();
fetchProducts();
updateCartBadge();
loadWishlistIds();

// ADDED: PARTICLES FOR LUXURY THEME
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