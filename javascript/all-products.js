
// ALL PRODUCTS PAGE

let selectedCats = [];
let searchQueryAll = '';
let sortByAll = 'newest';

// BUILD FILTER CATEGORIES
function buildFilterCategories() {
  const cats = [...new Set(PRODUCTS.map(p => p.cat))];
  const container = document.getElementById('filterCategories');

  container.innerHTML = cats.map(cat => `
    <div class="filter-checkbox">
      <input type="checkbox" id="cat-${cat}" value="${cat}" onchange="updateSelectedCats()">
      <label for="cat-${cat}">${cat}</label>
    </div>
  `).join('');
}

function updateSelectedCats() {
  const checkboxes = document.querySelectorAll('.filter-checkbox input:checked');
  selectedCats = Array.from(checkboxes).map(cb => cb.value);
  renderAllProducts();
}

// FILTER & SEARCH ALL PRODUCTS
function filterAllProducts() {
  searchQueryAll = document.getElementById('searchInput').value.toLowerCase();
  renderAllProducts();
}

// Terima value langsung dari radio button atau select
function sortProducts(value) {
  sortByAll = value || document.getElementById('sortBy').value;
  renderAllProducts();
}

// Reset semua filter
function resetFilters() {
  selectedCats = [];
  searchQueryAll = '';
  sortByAll = 'newest';

  document.getElementById('searchInput').value = '';

  document.querySelectorAll('.filter-checkbox input').forEach(cb => cb.checked = false);

  const radios = document.querySelectorAll('.sort-radio input[type="radio"]');
  if (radios.length) radios[0].checked = true;

  const select = document.getElementById('sortBy');
  if (select) select.value = 'newest';

  renderAllProducts();
}

function renderAllProducts() {
  let filtered = PRODUCTS.filter(p => {
    const matchCat = selectedCats.length === 0 || selectedCats.includes(p.cat);
    const matchQ = p.name.toLowerCase().includes(searchQueryAll) || p.cat.toLowerCase().includes(searchQueryAll);
    return matchCat && matchQ;
  });

  // SORTING
  if (sortByAll === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortByAll === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortByAll === 'popular') {
    filtered.sort((a, b) => b.sold - a.sold);
  }

  // Update count
  const countEl = document.getElementById('productsCount');
  if (countEl) {
    countEl.innerHTML = `Menampilkan <strong>${filtered.length}</strong> produk`;
  }

  const grid = document.getElementById('allProdGrid');

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-regular fa-face-meh"></i><p>Produk tidak ditemukan.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const badge = p.badge ? `<div class="prod-badge ${BADGE_MAP[p.badge].cls}">${BADGE_MAP[p.badge].label}</div>` : '';
    const oldPrice = p.oldPrice ? `<span class="prod-old">${rp(p.oldPrice)}</span>` : '';
    const wished = wishlist.includes(p.id);
    return `
      <div class="prod-card" style="animation-delay:${i * 0.06}s;cursor:pointer" onclick="goDetail('${p.id}')">
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

// INIT ALL PRODUCTS PAGE
async function initAllProducts() {
  await fetchProducts();
  buildFilterCategories();
  renderAllProducts();
  updateCartBadge();
}
initAllProducts();