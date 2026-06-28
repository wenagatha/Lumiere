// ── DATA ──
let barang = [];

let customers = [];

let orders = [];

const statusOrder = ['Pending','Diproses','Dikirim','Selesai','Dibatalkan'];
const statusColor = {
  'Pending': 'background:#f0f4ff;color:#3B82F6',
  'Diproses': 'background:#fef9ec;color:#C9A84C',
  'Dikirim': 'background:#e8f4fd;color:#0891B2',
  'Selesai': 'background:#eaf7f0;color:#27AE60',
  'Dibatalkan': 'background:#fdf0ef;color:#C0392B',
};

let activeFilterOrder = '';
let editId = null;
let nextId = 100;
let fotoFiles = [];

// ── PHP BASE URL ──
const PHP_URL = '../backand/produk.php';

// ── FETCH BARANG DARI DATABASE ──
async function fetchBarang() {
  try {
    const res = await fetch(PHP_URL + '?action=get');
    const data = await res.json();
    if (data.status === 'sukses') {
      barang = data.data;
      renderBarang(barang);
      updateStatProduk();
    }
  } catch (e) {
    showToast('Gagal memuat data produk');
  }
}

function updateStatProduk() {
  document.getElementById('stat-produk').textContent = barang.length;
  const barProduk = document.getElementById('bar-produk');
  if (barProduk) barProduk.style.width = Math.min((barang.length / 30) * 100, 100) + '%';
}

// ── NAVIGASI ──
function goTo(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  el.classList.add('active');
  const titles = { dashboard: 'Dashboard', barang: 'Manajemen Barang', order: 'Manajemen Order', customer: 'Akun Customer' };
  document.getElementById('topbar-title').textContent = titles[page];
  if (page === 'barang') fetchBarang();
  if (page === 'customer') fetchCustomers().then(renderCustomer);
  if (page === 'order') fetchOrders();
  if (page === 'dashboard') { fetchCustomerStat(); fetchOrders(); fetchBarang(); }
}

// ── FORMAT ──
function formatRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// ── RENDER BARANG ──
function renderBarang(data) {
  const tb = document.getElementById('tabel-barang');
  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray);padding:32px;font-size:12px">Tidak ada barang ditemukan</td></tr>';
    return;
  }
  tb.innerHTML = data.map(b => `
    <tr>
      <td style="display:flex;align-items:center;gap:12px">
        ${b.gambar
          ? `<img src="../uploads/produk/${b.gambar}" style="width:44px;height:44px;object-fit:cover;flex-shrink:0">`
          : `<div style="width:44px;height:44px;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-light)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
        }
        <div class="product-name">${b.nama}</div>
      </td>
      <td><span class="product-cat">${b.kategori}</span></td>
      <td>${formatRp(b.harga)}</td>
      <td>
        ${b.stok == 0
          ? `<span class="badge badge-out">Habis</span>`
          : `<span class="badge ${b.stok <= 2 ? 'badge-low' : 'badge-ok'}">${b.stok} pcs</span>`
        }
      </td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-edit" onclick="editBarang(${b.id})">Edit</button>
        <button class="btn btn-danger" onclick="hapusBarang(${b.id})">Hapus</button>
      </td>
    </tr>
  `).join('');
  updateStatProduk();
}

let activeKategori = '';

function setKategori(kat, el) {
  activeKategori = kat;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  applyFilter();
}

function applyFilter() {
  const q = document.getElementById('search-barang').value.toLowerCase();
  const hasil = barang.filter(b => {
    const matchSearch = !q || b.nama.toLowerCase().includes(q) || b.kategori.toLowerCase().includes(q);
    const matchKat = !activeKategori || b.kategori === activeKategori;
    return matchSearch && matchKat;
  });
  renderBarang(hasil);
}

function filterBarang(q) { applyFilter(); }

// ── FOTO ──
function handleFoto(input) {
  const files = Array.from(input.files);
  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = e => {
      fotoFiles.push({ name: f.name, src: e.target.result, file: f });
      renderPreview();
    };
    reader.readAsDataURL(f);
  });
  input.value = '';
}

function renderPreview() {
  const grid = document.getElementById('preview-grid');
  grid.innerHTML = fotoFiles.map((f, i) => `
    <div class="preview-item">
      <img src="${f.src}" alt="${f.name}">
      <button class="preview-remove" onclick="hapusFoto(${i})">×</button>
    </div>
  `).join('');
}

function hapusFoto(i) {
  fotoFiles.splice(i, 1);
  renderPreview();
}

// ── WARNA CUSTOM ──
let warnaCustom = [];
let warnaCustomCount = 10;

function tambahWarna() {
  document.getElementById('color-picker').click();
}

function addCustomWarna(hex) {
  const id = 'wc-custom-' + warnaCustomCount++;
  const group = document.getElementById('warna-group');
  const btn = group.querySelector('.warna-tambah');
  const html = `<input type="checkbox" class="warna-check" id="${id}" value="${hex}"><label class="warna-dot" for="${id}" style="background:${hex}"></label>`;
  btn.insertAdjacentHTML('beforebegin', html);
}

// ── BACA UKURAN ──
function getUkuran() {
  return ['XS','S','M','L','XL','XXL'].filter(s => {
    const el = document.getElementById('sz-' + s.toLowerCase());
    return el && el.checked;
  });
}

function setUkuran(arr) {
  ['XS','S','M','L','XL','XXL'].forEach(s => {
    const el = document.getElementById('sz-' + s.toLowerCase());
    if (el) el.checked = arr.includes(s);
  });
}

// ── BACA WARNA ──
function getWarna() {
  return Array.from(document.querySelectorAll('.warna-check:checked')).map(el => el.value);
}

function setWarna(arr) {
  document.querySelectorAll('.warna-check').forEach(el => {
    el.checked = arr.includes(el.value);
  });
}

// ── TAMBAH / EDIT BARANG ──
function openModal(id) {
  if (id === 'modal-tambah') {
    switchTab('tab-dasar', document.querySelector('.modal-tab'));
  }
  editId = null;
  fotoFiles = [];
  document.getElementById('modal-barang-title').textContent = 'Tambah Barang';
  document.getElementById('modal-barang-sub').textContent = 'Isi detail produk baru';
  document.getElementById('input-nama').value = '';
  document.getElementById('input-harga').value = '';
  document.getElementById('input-stok').value = '';
  document.getElementById('input-kategori').value = '';
  document.getElementById('input-material').value = '';
  document.getElementById('input-kondisi').value = '';
  document.getElementById('input-berat').value = '';
  document.getElementById('input-perawatan').value = '';
  document.getElementById('input-deskripsi').value = '';
  document.getElementById('preview-grid').innerHTML = '';
  setUkuran([]);
  setWarna([]);
  document.getElementById(id).classList.add('open');
  document.querySelector('#modal-tambah .modal-body').scrollTop = 0;
}

function editBarang(id) {
  const b = barang.find(x => x.id == id);
  if (!b) return;
  editId = id;
  fotoFiles = b.gambar ? [{ src: '../uploads/produk/' + b.gambar, name: b.gambar, file: null }] : [];
  document.getElementById('modal-barang-title').textContent = 'Edit Barang';
  document.getElementById('modal-barang-sub').textContent = 'Perbarui informasi dan stok barang';
  document.getElementById('input-nama').value = b.nama;
  document.getElementById('input-harga').value = b.harga;
  document.getElementById('input-stok').value = b.stok;
  document.getElementById('input-kategori').value = b.kategori;
  document.getElementById('input-material').value = b.material || '';
  document.getElementById('input-kondisi').value = b.kondisi || '';
  document.getElementById('input-berat').value = b.berat || '';
  document.getElementById('input-perawatan').value = b.perawatan || '';
  document.getElementById('input-deskripsi').value = b.deskripsi || '';
  renderPreview();
  setUkuran(Array.isArray(b.ukuran) ? b.ukuran : (b.ukuran ? b.ukuran.split(',') : []));
  setWarna(Array.isArray(b.warna) ? b.warna : (b.warna ? b.warna.split(',') : []));
  document.getElementById('modal-tambah').classList.add('open');
  document.querySelector('#modal-tambah .modal-body').scrollTop = 0;
}

async function simpanBarang() {
  const nama     = document.getElementById('input-nama').value.trim();
  const harga    = parseInt(document.getElementById('input-harga').value);
  const stok     = parseInt(document.getElementById('input-stok').value);
  const kategori = document.getElementById('input-kategori').value;

  if (!nama || !harga || isNaN(stok) || !kategori) {
    showToast('Lengkapi nama, harga, stok, dan kategori');
    return;
  }

  const formData = new FormData();
  formData.append('action', editId ? 'edit' : 'tambah');
  if (editId) formData.append('id', editId);
  formData.append('nama', nama);
  formData.append('harga', harga);
  formData.append('stok', stok);
  formData.append('kategori', kategori);
  formData.append('material', document.getElementById('input-material').value.trim());
  formData.append('kondisi', document.getElementById('input-kondisi').value);
  formData.append('berat', document.getElementById('input-berat').value.trim());
  formData.append('perawatan', document.getElementById('input-perawatan').value.trim());
  formData.append('deskripsi', document.getElementById('input-deskripsi').value.trim());
  formData.append('ukuran', getUkuran().join(','));
  formData.append('warna', getWarna().join(','));

  // Lampirkan file gambar baru kalau ada
  const fotoFile = fotoFiles.find(f => f.file);
  if (fotoFile) formData.append('gambar', fotoFile.file);

  try {
    const res = await fetch(PHP_URL, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.status === 'sukses') {
      showToast(data.pesan);
      closeModal('modal-tambah');
      fetchBarang();
    } else {
      showToast(data.pesan);
    }
  } catch (e) {
    showToast('Terjadi kesalahan. Coba lagi.');
  }
}

// ── HAPUS BARANG ──
function hapusBarang(id) {
  const b = barang.find(x => x.id == id);
  document.getElementById('confirm-title').textContent = 'Hapus Barang?';
  document.getElementById('confirm-msg').textContent = `"${b.nama}" akan dihapus secara permanen.`;
  document.getElementById('confirm-ok').onclick = async () => {
    const formData = new FormData();
    formData.append('action', 'hapus');
    formData.append('id', id);
    try {
      const res = await fetch(PHP_URL, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.status === 'sukses') {
        closeModal('modal-confirm');
        showToast('Barang berhasil dihapus');
        fetchBarang();
      }
    } catch (e) {
      showToast('Gagal menghapus barang');
    }
  };
  document.getElementById('modal-confirm').classList.add('open');
}

// ── ORDER ──
function setFilterOrder(status, el) {
  activeFilterOrder = status;
  document.querySelectorAll('#page-order .filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  applyFilterOrder();
}

async function fetchOrders() {
  try {
    const res = await fetch('../backand/pesanan.php?action=get_all');
    const data = await res.json();
    if (data.status === 'sukses') {
      orders = data.data;
      applyFilterOrder();
      updateOrderBadge();
      updateOrderStats();
      // dashboard ikut diperbarui begitu data order asli masuk
      renderRecentOrders(orders);
      renderBarChart(orders);
      renderDonut(orders);
    }
  } catch(e) {
    showToast('Gagal memuat data order');
  }
}

// ── CUSTOMER: AMBIL DARI DATABASE ──
async function fetchCustomers() {
  try {
    const res = await fetch('../backand/user.php?action=get_all');
    const data = await res.json();
    if (data.status === 'sukses') {
      customers = data.data.map(c => ({
        id: c.id,
        nama: `${c.nama_depan || ''} ${c.nama_belakang || ''}`.trim(),
        email: c.email,
        terdaftar: c.terdaftar ? new Date(c.terdaftar).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-',
        order: Number(c.jumlah_order) || 0,
        status: c.status
      }));
      return customers;
    } else {
      showToast(data.pesan || 'Gagal memuat data customer');
      return customers;
    }
  } catch (e) {
    showToast('Gagal memuat data customer');
    return customers;
  }
}

// ── DASHBOARD: TOTAL CUSTOMER DARI DATABASE ──
async function fetchCustomerStat() {
  const data = await fetchCustomers();
  const total = data.length;
  const statEl = document.getElementById('stat-customer');
  if (statEl) statEl.textContent = total;
  const barCust = document.getElementById('bar-customer');
  if (barCust) barCust.style.width = Math.min((total / 200) * 100, 100) + '%';
}

// ── DASHBOARD: TABEL ORDER TERBARU (5 teratas, dari data order asli) ──
function renderRecentOrders(data) {
  const tb = document.getElementById('tabel-dashboard-order');
  if (!tb) return;
  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray);padding:24px;font-size:12px">Belum ada order</td></tr>';
    return;
  }
  const terbaru = [...data]
    .sort((a, b) => new Date(b.dibuat) - new Date(a.dibuat))
    .slice(0, 5);

  tb.innerHTML = terbaru.map(o => {
    const produkLabel = o.jumlah_item > 1 ? `${o.jumlah_item} produk` : '1 produk';
    return `<tr>
      <td style="font-weight:500;font-size:12px;color:var(--gold)">#LM-${o.id}</td>
      <td>${o.nama_depan || ''} ${o.nama_belakang || ''}</td>
      <td style="font-size:12px;color:var(--gray)">${produkLabel}</td>
      <td style="font-weight:500">${formatRp(o.total)}</td>
      <td><span class="badge" style="${statusColor[o.status] || ''}">${o.status}</span></td>
    </tr>`;
  }).join('');
}

function updateOrderStats() {
  document.getElementById('stat-order').textContent = orders.length;
  const pending = orders.filter(o => o.status === 'Pending').length;
  const subEl = document.getElementById('stat-order-sub');
  if (subEl) subEl.textContent = pending + ' menunggu konfirmasi';
  const bo = document.getElementById('bar-order');
  if (bo) bo.style.width = Math.min((orders.length / 20) * 100, 100) + '%';
}

function updateOrderBadge() {
  const pending = orders.filter(o => o.status === 'Pending').length;
  const badge = document.getElementById('order-badge');
  if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'inline' : 'none'; }
}

function setFilterOrder(status, el) {
  activeFilterOrder = status;
  document.querySelectorAll('#page-order .filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  applyFilterOrder();
}

function applyFilterOrder() {
  const q = (document.getElementById('search-order').value || '').toLowerCase();
  const hasil = orders.filter(o => {
    const matchQ = !q || String(o.id).includes(q) || o.nama_depan?.toLowerCase().includes(q) || o.nama_belakang?.toLowerCase().includes(q);
    const matchS = !activeFilterOrder || o.status === activeFilterOrder;
    return matchQ && matchS;
  });
  renderOrder(hasil);
}

function renderOrder(data) {
  const tb = document.getElementById('tabel-order');
  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:32px;font-size:12px">Tidak ada order ditemukan</td></tr>';
    return;
  }
  tb.innerHTML = data.map(o => {
    const tgl = new Date(o.dibuat).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
    const produkLabel = o.jumlah_item > 1 ? `${o.jumlah_item} produk` : `1 produk`;
    return `<tr>
      <td style="font-weight:500;font-size:12px;color:var(--gold)">#LM-${o.id}</td>
      <td>${o.nama_depan || ''} ${o.nama_belakang || ''}</td>
      <td style="font-size:12px;color:var(--gray)">${produkLabel}</td>
      <td style="font-weight:500">${formatRp(o.total)}</td>
      <td style="font-size:12px;color:var(--gray)">${tgl}</td>
      <td><span class="badge" style="${statusColor[o.status]}">${o.status}</span></td>
      <td><button class="btn btn-edit" onclick="lihatOrder(${o.id})">Detail</button></td>
    </tr>`;
  }).join('');
  updateOrderBadge();


  const pending = orders.filter(o => o.status === 'Pending').length;
  const badge = document.getElementById('order-badge');
  badge.textContent = pending;
  badge.style.display = pending > 0 ? 'inline' : 'none';
}

async function lihatOrder(id) {
  try {
    const res = await fetch(`../backand/pesanan.php?action=admin_detail&id=${id}`);
    const data = await res.json();
    if (data.status !== 'sukses') { showToast('Gagal memuat detail order'); return; }
    const o = data.data;
    const tgl = new Date(o.dibuat).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});

    document.getElementById('detail-order-id').textContent = '#LM-' + o.id;
    document.getElementById('detail-order-tgl').textContent = tgl;
    document.getElementById('detail-nama').textContent = (o.nama_depan || '') + ' ' + (o.nama_belakang || '');
    document.getElementById('detail-hp').textContent = o.no_telp || '-';
    document.getElementById('detail-alamat').textContent = o.alamat_pengiriman || '-';
    document.getElementById('detail-metode').textContent = o.metode_bayar || '-';
    document.getElementById('detail-total').textContent = formatRp(o.total);

    const badge = document.getElementById('detail-order-badge');
    badge.textContent = o.status;
    badge.setAttribute('style', `${statusColor[o.status]};padding:4px 12px;border-radius:20px;font-size:11px;`);

    document.getElementById('detail-items').innerHTML = o.items.map(i => `
      <tr style="border-bottom:1px solid var(--cream-dark)">
        <td style="padding:10px 0;font-size:13px">${i.nama_produk}</td>
        <td style="padding:10px 0;font-size:13px;text-align:center">${i.qty}</td>
        <td style="padding:10px 0;font-size:13px;text-align:right">${formatRp(i.qty * i.harga)}</td>
      </tr>
    `).join('');

    let btns = '';
    if (o.status === 'Pending') {
      btns = `
        <button class="btn btn-primary" onclick="updateStatusOrder(${o.id},'Diproses')" style="background:var(--green)">✓ Proses Order</button>
        <button class="btn btn-danger" onclick="updateStatusOrder(${o.id},'Dibatalkan')">✗ Batalkan</button>`;
    } else if (o.status === 'Diproses') {
      btns = `
        <button class="btn btn-primary" onclick="updateStatusOrder(${o.id},'Dikirim')">→ Tandai Dikirim</button>
        <button class="btn btn-danger" onclick="updateStatusOrder(${o.id},'Dibatalkan')">Batalkan</button>`;
    } else if (o.status === 'Dikirim') {
      btns = `<button class="btn btn-primary" onclick="updateStatusOrder(${o.id},'Diterima')">→ Tandai Diterima</button>`;
    } else {
      btns = `<span style="font-size:12px;color:var(--gray);font-style:italic">Order sudah <strong>${o.status.toLowerCase()}</strong>.</span>`;
    }
    document.getElementById('status-btns').innerHTML = btns;
    document.getElementById('modal-order').classList.add('open');
  } catch(e) {
    showToast('Gagal memuat detail order');
  }
}

async function updateStatusOrder(id, status) {
  const fd = new FormData();
  fd.append('action', 'update_status');
  fd.append('id_pesanan', id);
  fd.append('status', status);

  try {
    const res = await fetch('../backand/pesanan.php', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.status === 'sukses') {
      await fetchOrders();
      closeModal('modal-order');
      showToast(`Order #LM-${id} → ${status}`);
    } else {
      showToast(data.pesan);
    }
  } catch(e) {
    showToast('Gagal update status order');
  }
}

// ── RENDER CUSTOMER ──
function renderCustomer(data) {
  const tb = document.getElementById('tabel-customer');
  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:32px;font-size:12px">Tidak ada customer ditemukan</td></tr>';
    return;
  }
  tb.innerHTML = data.map(c => `
    <tr>
      <td style="font-weight:500">${c.nama}</td>
      <td style="color:var(--gray);font-size:12px">${c.email}</td>
      <td style="color:var(--gray);font-size:12px">${c.terdaftar}</td>
      <td style="text-align:center">${c.order}</td>
      <td><span class="badge ${c.status === 'aktif' ? 'badge-active' : 'badge-blocked'}">${c.status}</span></td>
      <td>
        <button class="btn ${c.status === 'aktif' ? 'btn-danger' : 'btn-edit'}" onclick="toggleBlock(${c.id})">
          ${c.status === 'aktif' ? 'Blokir' : 'Aktifkan'}
        </button>
      </td>
    </tr>
  `).join('');
  document.getElementById('stat-customer').textContent = customers.length;
  const barCust = document.getElementById('bar-customer');
  if (barCust) barCust.style.width = Math.min((customers.length / 200) * 100, 100) + '%';
}

function filterCustomer(q) {
  const hasil = customers.filter(c =>
    c.nama.toLowerCase().includes(q.toLowerCase()) ||
    c.email.toLowerCase().includes(q.toLowerCase())
  );
  renderCustomer(hasil);
}

function toggleBlock(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  const aksi = c.status === 'aktif' ? 'blokir' : 'aktifkan';
  document.getElementById('confirm-title').textContent = c.status === 'aktif' ? 'Blokir Customer?' : 'Aktifkan Customer?';
  document.getElementById('confirm-msg').textContent = `Apakah kamu yakin ingin ${aksi} akun "${c.nama}"?`;
  document.getElementById('confirm-ok').style.background = c.status === 'aktif' ? 'var(--red)' : 'var(--green)';
  document.getElementById('confirm-ok').textContent = c.status === 'aktif' ? 'Blokir' : 'Aktifkan';
  document.getElementById('confirm-ok').onclick = async () => {
    const fd = new FormData();
    fd.append('action', 'toggle_status');
    fd.append('id', id);
    try {
      const res = await fetch('../backand/user.php', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.status === 'sukses') {
        c.status = data.status_baru;
        renderCustomer(customers);
        closeModal('modal-confirm');
        showToast(`Akun berhasil ${c.status === 'aktif' ? 'diaktifkan' : 'diblokir'}`);
      } else {
        closeModal('modal-confirm');
        showToast(data.pesan || 'Gagal memperbarui status akun');
      }
    } catch (e) {
      closeModal('modal-confirm');
      showToast('Gagal memperbarui status akun');
    }
  };
  document.getElementById('modal-confirm').classList.add('open');
}

// ── LOGOUT ──
function confirmLogout() {
  document.getElementById('confirm-title').textContent = 'Logout?';
  document.getElementById('confirm-msg').textContent = 'Kamu akan keluar dari panel admin.';
  document.getElementById('confirm-ok').style.background = 'var(--black)';
  document.getElementById('confirm-ok').textContent = 'Logout';
  document.getElementById('confirm-ok').onclick = () => {
    showToast('Sampai jumpa!');
    setTimeout(() => {
      closeModal('modal-confirm');
      window.location.href = '../Html/lumiere-home.html';
    }, 1500);
  };
  document.getElementById('modal-confirm').classList.add('open');
}

// ── MODAL UTILS ──
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ── MODAL TABS ──
function switchTab(tabId, el) {
  document.querySelectorAll('#modal-tambah .tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#modal-tambah .modal-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  el.classList.add('active');
}

// ── TOAST ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── TANGGAL TOPBAR ──
(function() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  const now = new Date();
  const opts = { weekday:'long', day:'numeric', month:'long', year:'numeric' };
  el.textContent = now.toLocaleDateString('id-ID', opts);
})();

// ── INIT DASHBOARD STATS ──
(function initDashboardStats() {
  fetchCustomerStat();
  fetchOrders();
  fetchBarang();
})();

// ── CHART: BAR PENJUALAN (6 bulan terakhir, dari data order asli) ──
function renderBarChart(ordersData) {
  const chartEl = document.getElementById('bar-chart');
  const labelEl = document.getElementById('bar-labels');
  if (!chartEl) return;

  const namaBulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const now = new Date();

  // siapkan 6 bucket bulan terakhir (termasuk bulan ini)
  const dataBulan = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    dataBulan.push({
      key: d.getFullYear() + '-' + d.getMonth(),
      label: namaBulan[d.getMonth()],
      val: 0,
      highlight: i === 0
    });
  }

  (ordersData || []).forEach(o => {
    if (!o.dibuat) return;
    const d = new Date(o.dibuat);
    const key = d.getFullYear() + '-' + d.getMonth();
    const bucket = dataBulan.find(b => b.key === key);
    if (bucket) bucket.val += Number(o.total) || 0;
  });

  const maxVal = Math.max(...dataBulan.map(d => d.val), 1);

  chartEl.innerHTML = dataBulan.map(d => {
    const pct = (d.val / maxVal) * 100;
    const valLabel = 'Rp ' + (d.val / 1000000).toFixed(1) + 'jt';
    return `
      <div class="bar-col">
        <div class="bar-tooltip">${valLabel}</div>
        <div class="bar-fill${d.highlight ? ' highlight' : ''}" style="height:${pct}%"></div>
      </div>`;
  }).join('');

  labelEl.innerHTML = dataBulan.map(d =>
    `<div style="flex:1;text-align:center;font-size:9px;color:var(--gray);letter-spacing:0.5px">${d.label}</div>`
  ).join('');
}

// ── CHART: DONUT STATUS ORDER ──
function renderDonut(ordersData) {
  const svg = document.getElementById('donut-svg');
  const legendEl = document.getElementById('donut-legend');
  if (!svg) return;

  const statusList = ['Pending','Diproses','Dikirim','Selesai','Dibatalkan'];
  const colors = {
    'Pending': '#3B82F6',
    'Diproses': '#C9A84C',
    'Dikirim': '#0891B2',
    'Selesai': '#27AE60',
    'Dibatalkan': '#C0392B',
  };

  const data = ordersData || [];
  const counts = {};
  statusList.forEach(s => counts[s] = 0);
  data.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });

  const total = data.length;
  const cx = 60, cy = 60, r = 46, innerR = 28;
  const circumference = 2 * Math.PI * r;

  if (!total) {
    svg.innerHTML = `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="22" fill="#2C2C2C" font-weight="300">0</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="Jost,sans-serif" font-size="8" fill="#888" letter-spacing="1">ORDER</text>`;
    legendEl.innerHTML = '';
    return;
  }

  let offset = 0;
  let paths = '';
  statusList.forEach(s => {
    const count = counts[s];
    if (!count) return;
    const frac = count / total;
    const dashLen = frac * circumference;
    const gap = circumference - dashLen;
    const rotate = (offset / total) * 360 - 90;
    paths += `<circle
      cx="${cx}" cy="${cy}" r="${r}"
      fill="none"
      stroke="${colors[s]}"
      stroke-width="14"
      stroke-dasharray="${dashLen} ${gap}"
      stroke-dashoffset="0"
      transform="rotate(${rotate} ${cx} ${cy})"
      style="opacity:0.85"
    />`;
    offset += count;
  });

  paths += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="22" fill="#2C2C2C" font-weight="300">${total}</text>
  <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="Jost,sans-serif" font-size="8" fill="#888" letter-spacing="1">ORDER</text>`;

  svg.innerHTML = paths;

  legendEl.innerHTML = statusList
    .filter(s => counts[s] > 0)
    .map(s => `
      <div class="legend-item">
        <div class="legend-left">
          <div class="legend-dot" style="background:${colors[s]}"></div>
          ${s}
        </div>
        <div class="legend-count">${counts[s]}</div>
      </div>`)
    .join('');
}