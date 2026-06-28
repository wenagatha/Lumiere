
// PROFILE DATA MANAGEMENT
let currentUser = {};
let allPesanan = [];
let filterAktif = 'Semua';

async function logout() {
  if (confirm('Apakah kamu yakin ingin keluar?')) {
    await fetch('../backand/logout.php');
    localStorage.removeItem('lum_user');
    window.location.href = 'lumiere-auth.html?tab=login';
  }
}

async function loadUserProfile() {
  try {
    const response = await fetch('../backand/profil-user.php', {
      method: 'GET',
      credentials: 'same-origin'
    });
    const result = await response.json();
    if (result.status === 'sukses') {
      currentUser = result.data;
      populateProfileUI();
    } else {
      window.location.href = 'lumiere-auth.html?tab=login';
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

function populateProfileUI() {
  const avatarEl = document.querySelector('.avatar');
  if (avatarEl) {
    avatarEl.innerHTML = `${currentUser.initials}<div class="avatar-badge"><i class="ti ti-check"></i></div>`;
  }
  const userNameEl = document.querySelector('.user-name');
  if (userNameEl) userNameEl.textContent = currentUser.nama_depan + ' ' + currentUser.nama_belakang;

  const userEmailEl = document.querySelector('.user-email');
  if (userEmailEl) userEmailEl.textContent = currentUser.email;

  const pageTitleEl = document.querySelector('#page-overview .page-title');
  if (pageTitleEl) pageTitleEl.textContent = 'Selamat datang, ' + currentUser.nama_depan;

  const uploadAvatarEl = document.querySelector('.profile-upload-avatar');
  if (uploadAvatarEl) {
    if (currentUser.foto) {
      uploadAvatarEl.innerHTML = `<img src="../uploads/user/${currentUser.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      const avatarEl = document.querySelector('.avatar');
      if (avatarEl) avatarEl.innerHTML = `<img src="../uploads/user/${currentUser.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"><div class="avatar-badge"><i class="ti ti-check"></i></div>`;
    } else {
      uploadAvatarEl.textContent = currentUser.initials;
    }
  }

  const fnameEl = document.getElementById('fname');
  if (fnameEl) fnameEl.value = currentUser.nama_depan;
  const lnameEl = document.getElementById('lname');
  if (lnameEl) lnameEl.value = currentUser.nama_belakang;
  const emailEl = document.getElementById('email');
  if (emailEl) emailEl.value = currentUser.email;
  const phoneEl = document.getElementById('phone');
  if (phoneEl) phoneEl.value = currentUser.no_telp || '';
}

async function updateProfile(e) {
  if (e) e.preventDefault();

  const nama_depan    = document.getElementById('fname').value.trim();
  const nama_belakang = document.getElementById('lname').value.trim();
  const no_telp       = document.getElementById('phone').value.trim();

  if (!nama_depan || !nama_belakang) {
    showProfileNotif('Nama depan dan belakang harus diisi.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('nama_depan', nama_depan);
  formData.append('nama_belakang', nama_belakang);
  formData.append('no_telp', no_telp);

  const fotoInput = document.getElementById('foto-upload');
  if (fotoInput && fotoInput.files[0]) {
    formData.append('foto', fotoInput.files[0]);
}

  try {
    const response = await fetch('../backand/profil-user.php', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const result = await response.json();

    if (result.status === 'sukses') {
      currentUser.nama_depan    = nama_depan;
      currentUser.nama_belakang = nama_belakang;
      currentUser.no_telp       = no_telp;
      currentUser.initials      = nama_depan[0].toUpperCase() + nama_belakang[0].toUpperCase();

      // Update localStorage
      const user = JSON.parse(localStorage.getItem('lum_user') || '{}');
      user.nama = nama_depan;
      if (result.foto) user.foto = result.foto;
      localStorage.setItem('lum_user', JSON.stringify(user));

      populateProfileUI();
      showProfileNotif('Profil berhasil diperbarui!', 'sukses');
      setTimeout(() => location.reload(), 1000);
    } else {
      showProfileNotif(result.pesan || 'Gagal memperbarui profil.', 'error');
    }
  } catch (error) {
    showProfileNotif('Terjadi kesalahan. Coba lagi.', 'error');
  }
}

function showProfileNotif(pesan, tipe) {
  const existing = document.querySelector('.notif-toast-profile');
  if (existing) existing.remove();

  const notif = document.createElement('div');
  notif.className = 'notif-toast-profile';
  notif.style.cssText = `
    padding:12px 16px;margin:16px 0;border-radius:4px;display:flex;align-items:center;
    gap:8px;font-size:13px;font-weight:500;
    background:${tipe === 'sukses' ? '#eaf3de' : '#fdf0f0'};
    color:${tipe === 'sukses' ? '#3B6D11' : '#8b2020'};
    border:0.5px solid ${tipe === 'sukses' ? '#c0dd97' : '#d9534f'};
  `;
  notif.innerHTML = `<span>${tipe === 'sukses' ? '✔' : '✕'}</span><span>${pesan}</span>`;

  const btn = document.getElementById('btn-simpan-profil');
  if (btn) btn.parentNode.insertBefore(notif, btn);

  setTimeout(() => { notif.style.opacity = '0'; setTimeout(() => notif.remove(), 300); }, 3000);
}

// PESANAN
const statusClass = {
  'Pending':    'status-process',
  'Diproses':   'status-process',
  'Dikirim':    'status-shipping',
  'Diterima':   'status-delivered',
  'Selesai':    'status-delivered',
  'Dibatalkan': 'status-process',
};

const fmt = n => 'Rp ' + parseInt(n).toLocaleString('id-ID');

async function loadPesanan() {
  try {
    const res = await fetch('../backand/pesanan.php?action=get');
    const data = await res.json();
    if (data.status === 'sukses') {
      allPesanan = data.data;
      renderPesanan(allPesanan);
      updateOverviewStats();
      renderPesananTerbaru();
    }
  } catch(e) {
    console.error('Gagal load pesanan:', e);
  }
}

function updateOverviewStats() {
  const totalEl = document.querySelector('#page-overview .stats-row .stat-card:nth-child(1) .stat-num');
  const dikirimEl = document.querySelector('#page-overview .stats-row .stat-card:nth-child(2) .stat-num');

  if (totalEl) totalEl.textContent = allPesanan.length;
  if (dikirimEl) dikirimEl.textContent = allPesanan.filter(p => p.status === 'Dikirim').length;

  const subEl = document.querySelector('#page-overview .page-sub');
  if (subEl) subEl.textContent = `Member sejak ${new Date(currentUser.terdaftar).toLocaleDateString('id-ID', {month:'long', year:'numeric'})}`;
}

function renderPesananTerbaru() {
  const container = document.querySelector('#page-overview .order-card')?.parentNode;
  if (!container) return;

  // Hapus order card lama yang hardcode
  container.querySelectorAll('.order-card').forEach(el => el.remove());

  const terbaru = allPesanan.slice(0, 3);
  if (!terbaru.length) {
    container.insertAdjacentHTML('beforeend', '<p style="font-size:13px;color:var(--muted);padding:1rem 0">Belum ada pesanan.</p>');
    return;
  }

  terbaru.forEach(p => {
    const tgl = new Date(p.dibuat).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
    container.insertAdjacentHTML('beforeend', `
      <div class="order-card">
        <div class="order-img"><i class="ti ti-package"></i></div>
        <div class="order-info">
          <div class="order-name">Pesanan #LM-${p.id} (${p.jumlah_item} item)</div>
          <div class="order-meta">${tgl} · ${fmt(p.total)}</div>
        </div>
        <div class="order-right">
          <div class="order-price">${fmt(p.total)}</div>
          <div class="order-status ${statusClass[p.status] || 'status-process'}">${p.status}</div>
        </div>
      </div>
    `);
  });
}

function renderPesanan(data) {
  const container = document.getElementById('page-orders');
  const existing = container.querySelectorAll('.order-card, .pesan-kosong');
  existing.forEach(el => el.remove());

  const subEl = container.querySelector('.page-sub');
  if (subEl) subEl.textContent = `${data.length} pesanan total · ${data.filter(p=>p.status==='Dikirim').length} sedang dalam pengiriman`;

  if (!data.length) {
    container.insertAdjacentHTML('beforeend', '<p class="pesan-kosong" style="font-size:13px;color:var(--muted);padding:1rem 0">Tidak ada pesanan.</p>');
    return;
  }

  const filterRow = container.querySelector('.filter-row');
  data.forEach(p => {
    const tgl = new Date(p.dibuat).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
    const html = `
      <div class="order-card" data-status="${p.status}" style="flex-direction:column;align-items:stretch;padding:0;">
        <!-- Header pesanan -->
        <div style="display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;">
          <div class="order-img"><i class="ti ti-package"></i></div>
          <div class="order-info" style="flex:1;">
            <div class="order-name">Pesanan #LM-${p.id} (${p.jumlah_item} item)</div>
            <div class="order-meta">${tgl} · ${p.metode_bayar || '-'}</div>
          </div>
          <div class="order-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            <div class="order-price">${fmt(p.total)}</div>
            <div class="order-status ${statusClass[p.status] || 'status-process'}">${p.status}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
              ${p.status === 'Dikirim' ? `<button class="btn-terima" onclick="terimaOrder(${p.id})" style="font-size:10px;padding:5px 12px;background:var(--gold);color:#fff;border:none;border-radius:2px;cursor:pointer;">Konfirmasi Diterima</button>` : ''}
              ${p.status === 'Diterima' ? `<button class="btn-ulasan" onclick="bukaUlasan(${p.id})" style="font-size:10px;padding:5px 12px;background:transparent;color:var(--gold);border:0.5px solid var(--gold);border-radius:2px;cursor:pointer;letter-spacing:1px;">Beri Ulasan</button>` : ''}
              ${p.status === 'Pending' ? `<button onclick="batalOrder(${p.id})" style="font-size:10px;padding:5px 12px;background:transparent;color:#D85A30;border:0.5px solid #D85A30;border-radius:2px;cursor:pointer;">Batalkan</button>` : ''}
            </div>
          </div>
        </div>
        <!-- Detail item (langsung tampil) -->
        <div id="detail-pesanan-${p.id}" class="detail-pesanan">
          <p class="detail-pesanan-title">Item Pesanan</p>
          <div id="items-pesanan-${p.id}" style="display:flex;flex-direction:column;gap:0.5rem;">
            <p style="font-size:12px;color:var(--text-soft);">Memuat...</p>
          </div>
        </div>
      </div>
    `;
    filterRow.insertAdjacentHTML('afterend', html);
    loadDetailPesanan(p.id);
  });
}

async function loadDetailPesanan(idPesanan) {
  const itemsEl = document.getElementById('items-pesanan-' + idPesanan);
  if (!itemsEl || itemsEl.dataset.loaded) return;

  try {
    const res  = await fetch(`../backand/pesanan.php?action=detail&id=${idPesanan}`);
    const data = await res.json();

    if (data.status === 'sukses' && data.data.items.length) {
      itemsEl.innerHTML = data.data.items.map(item => `
        <div class="detail-item-row">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:48px;height:48px;background:var(--bg-card);border-radius:6px;overflow:hidden;flex-shrink:0;border:0.5px solid var(--border-soft);">
              ${item.gambar
                ? `<img src="../uploads/produk/${item.gambar}" style="width:100%;height:100%;object-fit:cover;">`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="ti ti-shirt" style="font-size:18px;color:var(--text-muted);"></i></div>`
              }
            </div>
            <div>
              <div style="font-size:13px;font-family:'Jost',sans-serif;color:var(--text);">${item.nama_produk}</div>
              <div style="font-size:11px;color:var(--text-soft);">
                Qty: ${item.qty}
                ${item.ukuran ? '· ' + item.ukuran : ''}
                ${item.warna  ? '· ' + item.warna  : ''}
              </div>
            </div>
          </div>
          <div style="font-size:13px;font-family:'Jost',sans-serif;color:var(--text);text-align:right;">
            ${fmt(item.harga * item.qty)}
            <div style="font-size:11px;color:var(--text-soft);">${fmt(item.harga)} / pcs</div>
          </div>
        </div>
      `).join('');
      itemsEl.dataset.loaded = '1';
    } else {
      itemsEl.innerHTML = '<p style="font-size:12px;color:var(--text-soft);">Tidak ada item.</p>';
    }
  } catch(e) {
    itemsEl.innerHTML = '<p style="font-size:12px;color:#E06040;">Gagal memuat item.</p>';
  }
}

function filterPesanan(status, el) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  filterAktif = status;

  const filtered = status === 'Semua' ? allPesanan : allPesanan.filter(p => p.status === status);
  renderPesanan(filtered);
}

async function terimaOrder(id) {
  if (!confirm('Konfirmasi pesanan sudah diterima?')) return;
  const fd = new FormData();
  fd.append('action', 'terima');
  fd.append('id_pesanan', id);
  const res = await fetch('../backand/pesanan.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.status === 'sukses') {
    loadPesanan();
    showProfileNotif('Pesanan dikonfirmasi diterima!', 'sukses');
  }
}

async function batalOrder(id) {
  if (!confirm('Batalkan pesanan ini?')) return;
  const fd = new FormData();
  fd.append('action', 'batal');
  fd.append('id_pesanan', id);
  const res = await fetch('../backand/pesanan.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.status === 'sukses') {
    loadPesanan();
    showProfileNotif('Pesanan berhasil dibatalkan.', 'sukses');
  } else {
    showProfileNotif(data.pesan, 'error');
  }
}

// ULASAN
let ulasanIdPesanan = null;
let ulasanItems     = []; // simpan items yang lagi diulas

async function bukaUlasan(idPesanan) {
  ulasanIdPesanan = idPesanan;

  const existing = document.getElementById('modal-ulasan');
  if (existing) existing.remove();

  // Fetch items pesanan dulu
  const detailRes  = await fetch(`../backand/pesanan.php?action=detail&id=${idPesanan}`);
  const detailData = await detailRes.json();
  if (detailData.status !== 'sukses') { alert('Gagal ambil data pesanan.'); return; }

  ulasanItems = detailData.data.items;

  // Render form per item
  const itemForms = ulasanItems.map((item, idx) => `
    <div style="padding:1rem 0;border-bottom:0.5px solid var(--border);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:0.75rem;">
        <div style="width:44px;height:44px;background:var(--bg-elevated);border-radius:2px;overflow:hidden;flex-shrink:0;border:0.5px solid var(--border-soft);">
          ${item.gambar
            ? `<img src="../uploads/produk/${item.gambar}" style="width:100%;height:100%;object-fit:cover;">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="ti ti-shirt" style="font-size:16px;color:var(--text-muted);"></i></div>`
          }
        </div>
        <div>
          <div style="font-size:13px;font-family:'Jost',sans-serif;color:var(--text);font-weight:500;">${item.nama_produk}</div>
          <div style="font-size:11px;color:var(--text-soft);">Qty: ${item.qty}${item.ukuran ? ' · ' + item.ukuran : ''}${item.warna ? ' · ' + item.warna : ''}</div>
        </div>
      </div>
      <div style="margin-bottom:0.5rem;">
        <div id="star-${idx}" style="display:flex;gap:6px;font-size:24px;cursor:pointer;">
          ${[1,2,3,4,5].map(s => `<span onclick="setRatingItem(${idx},${s})" style="color:var(--text-muted);transition:color 0.15s;">★</span>`).join('')}
        </div>
        <input type="hidden" id="rating-${idx}" value="0">
      </div>
      <textarea id="komentar-${idx}" rows="2" style="width:100%;font-family:'Jost',sans-serif;font-size:13px;padding:8px 10px;border:0.5px solid var(--border);border-radius:2px;background:var(--bg-elevated);color:var(--text);resize:none;box-sizing:border-box;outline:none;" placeholder="Ceritakan pendapat kamu tentang produk ini..."></textarea>
    </div>
  `).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-ulasan';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:1rem;box-sizing:border-box;backdrop-filter:blur(2px);';
  modal.innerHTML = `
    <div style="background:var(--bg-card);border:0.5px solid var(--border);border-radius:4px;padding:2rem;width:520px;max-width:100%;margin:auto;max-height:90vh;overflow-y:auto;scrollbar-width:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--text);">Beri Ulasan</h3>
        <button onclick="document.getElementById('modal-ulasan').remove()" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;line-height:1;padding:0 4px;">&times;</button>
      </div>
      <p style="font-size:12px;color:var(--text-soft);margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:0.5px solid var(--border);">Pesanan #LM-${idPesanan} · ${ulasanItems.length} produk</p>
      <div id="ulasan-items">${itemForms}</div>
      <div style="display:flex;gap:8px;margin-top:1.5rem;">
        <button onclick="kirimUlasan()" style="flex:1;padding:12px;background:var(--gold);color:#0E0D0B;border:none;border-radius:2px;cursor:pointer;font-family:'Jost',sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Kirim Semua Ulasan</button>
        <button onclick="document.getElementById('modal-ulasan').remove()" style="padding:12px 20px;background:transparent;color:var(--text-soft);border:0.5px solid var(--border);border-radius:2px;cursor:pointer;font-family:'Jost',sans-serif;font-size:12px;">Batal</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const style = document.createElement('style');
  style.textContent = '#modal-ulasan > div::-webkit-scrollbar { display: none; }';
  document.head.appendChild(style);
}

function setRatingItem(idx, val) {
  document.getElementById('rating-' + idx).value = val;
  document.querySelectorAll(`#star-${idx} span`).forEach((s, i) => {
    s.style.color = i < val ? '#C9A84C' : '#D5CEBF';
  });
}

async function kirimUlasan() {
  // Validasi semua item sudah diberi rating
  for (let i = 0; i < ulasanItems.length; i++) {
    const rating = parseInt(document.getElementById('rating-' + i).value);
    if (!rating) {
      alert(`Pilih rating untuk "${ulasanItems[i].nama_produk}" dulu!`);
      return;
    }
  }

  const btnKirim = document.querySelector('#modal-ulasan button');
  btnKirim.textContent = 'Mengirim...';
  btnKirim.disabled = true;

  // Kirim ulasan per item
  for (let i = 0; i < ulasanItems.length; i++) {
    const item     = ulasanItems[i];
    const rating   = parseInt(document.getElementById('rating-' + i).value);
    const komentar = document.getElementById('komentar-' + i).value.trim();

    const fd = new FormData();
    fd.append('action',     'tambah');
    fd.append('id_produk',  item.id_produk);
    fd.append('id_pesanan', ulasanIdPesanan);
    fd.append('rating',     rating);
    fd.append('komentar',   komentar);
    await fetch('../backand/ulasan.php', { method: 'POST', body: fd });
  }

  // Update status pesanan jadi Selesai
  const fd2 = new FormData();
  fd2.append('action',     'selesai');
  fd2.append('id_pesanan', ulasanIdPesanan);
  await fetch('../backand/pesanan.php', { method: 'POST', body: fd2 });

  document.getElementById('modal-ulasan').remove();
  showProfileNotif('Ulasan berhasil dikirim!', 'sukses');
  loadPesanan();
}

// ALAMAT
let allAlamat = [];

async function loadAlamat() {
  try {
    const res = await fetch('../backand/alamat.php?action=get');
    const data = await res.json();
    if (data.status === 'sukses') {
      allAlamat = data.data;
      renderAlamat();
    }
  } catch(e) {
    console.error('Gagal load alamat:', e);
  }
}

function renderAlamat() {
  const container = document.getElementById('page-address');
  container.querySelectorAll('.addr-card').forEach(el => el.remove());

  const addBtn = container.querySelector('.address-add-button');

  if (!allAlamat.length) {
    addBtn.insertAdjacentHTML('beforebegin', '<p style="font-size:13px;color:var(--muted);padding:1rem 0">Belum ada alamat tersimpan.</p>');
    return;
  }

  allAlamat.forEach(a => {
    addBtn.insertAdjacentHTML('beforebegin', `
      <div class="addr-card" id="addr-${a.id}">
        <div>
          <div class="addr-name">${a.nama_penerima} · ${a.no_telp}</div>
          <div class="addr-text">${a.alamat}<br>${a.kota}, ${a.provinsi} ${a.kode_pos || ''}</div>
          ${a.is_utama == 1 ? '<span class="addr-badge">Utama</span>' : `<button onclick="setUtama(${a.id})" style="font-size:10px;margin-top:6px;color:var(--gold);background:none;border:none;cursor:pointer;font-family:'Jost',sans-serif;">Jadikan utama</button>`}
        </div>
        <div class="addr-actions">
          <span onclick="editAlamat(${a.id})">Edit</span>
          <span class="address-separator">|</span>
          <span class="text-muted" onclick="hapusAlamat(${a.id})" style="cursor:pointer;color:#D85A30;">Hapus</span>
        </div>
      </div>
    `);
  });
}

function bukaFormAlamat(id = null) {
  const existing = document.getElementById('modal-alamat');
  if (existing) existing.remove();

  const alamat = id ? allAlamat.find(a => a.id == id) : null;

  const modal = document.createElement('div');
  modal.id = 'modal-alamat';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;';
  modal.innerHTML = `
    <div style="background:#FDFCF9;border-radius:4px;padding:2rem;width:560px;max-width:90vw;margin:auto;">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;margin-bottom:1.5rem;">${id ? 'Edit' : 'Tambah'} Alamat</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div><label style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">Nama Penerima</label><input id="al-nama" value="${alamat?.nama_penerima||''}" style="width:100%;margin-top:6px;padding:10px;border:0.5px solid #D5CEBF;border-radius:2px;background:#F5F2EC;font-family:'Jost',sans-serif;font-size:13px;"></div>
        <div><label style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">No. Telepon</label><input id="al-telp" value="${alamat?.no_telp||''}" style="width:100%;margin-top:6px;padding:10px;border:0.5px solid #D5CEBF;border-radius:2px;background:#F5F2EC;font-family:'Jost',sans-serif;font-size:13px;"></div>
        <div style="grid-column:1/-1"><label style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">Alamat Lengkap</label><textarea id="al-alamat" rows="2" style="width:100%;margin-top:6px;padding:10px;border:0.5px solid #D5CEBF;border-radius:2px;background:#F5F2EC;font-family:'Jost',sans-serif;font-size:13px;resize:none;">${alamat?.alamat||''}</textarea></div>
        <div><label style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">Kota</label><input id="al-kota" value="${alamat?.kota||''}" style="width:100%;margin-top:6px;padding:10px;border:0.5px solid #D5CEBF;border-radius:2px;background:#F5F2EC;font-family:'Jost',sans-serif;font-size:13px;"></div>
        <div><label style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">Provinsi</label><input id="al-provinsi" value="${alamat?.provinsi||''}" style="width:100%;margin-top:6px;padding:10px;border:0.5px solid #D5CEBF;border-radius:2px;background:#F5F2EC;font-family:'Jost',sans-serif;font-size:13px;"></div>
        <div><label style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">Kode Pos</label><input id="al-kodepos" value="${alamat?.kode_pos||''}" style="width:100%;margin-top:6px;padding:10px;border:0.5px solid #D5CEBF;border-radius:2px;background:#F5F2EC;font-family:'Jost',sans-serif;font-size:13px;"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:1rem;"><input type="checkbox" id="al-utama" ${alamat?.is_utama==1?'checked':''}><label for="al-utama" style="font-size:13px;color:var(--muted);">Jadikan alamat utama</label></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:1rem;">
        <button onclick="simpanAlamat(${id||'null'})" style="flex:1;padding:12px;background:#2C2A26;color:#F5F2EC;border:none;border-radius:2px;cursor:pointer;font-family:'Jost',sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Simpan</button>
        <button onclick="document.getElementById('modal-alamat').remove()" style="padding:12px 20px;background:transparent;color:var(--muted);border:0.5px solid #D5CEBF;border-radius:2px;cursor:pointer;font-family:'Jost',sans-serif;">Batal</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function simpanAlamat(id) {
  const fd = new FormData();
  fd.append('action', id ? 'edit' : 'tambah');
  if (id) fd.append('id', id);
  fd.append('nama_penerima', document.getElementById('al-nama').value.trim());
  fd.append('no_telp', document.getElementById('al-telp').value.trim());
  fd.append('alamat', document.getElementById('al-alamat').value.trim());
  fd.append('kota', document.getElementById('al-kota').value.trim());
  fd.append('provinsi', document.getElementById('al-provinsi').value.trim());
  fd.append('kode_pos', document.getElementById('al-kodepos').value.trim());
  if (document.getElementById('al-utama').checked) fd.append('is_utama', '1');

  const res = await fetch('../backand/alamat.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.status === 'sukses') {
    document.getElementById('modal-alamat').remove();
    loadAlamat();
    showProfileNotif(data.pesan, 'sukses');
  } else {
    showProfileNotif(data.pesan, 'error');
  }
}

function editAlamat(id) { bukaFormAlamat(id); }

async function hapusAlamat(id) {
  if (!confirm('Hapus alamat ini?')) return;
  const fd = new FormData();
  fd.append('action', 'hapus');
  fd.append('id', id);
  const res = await fetch('../backand/alamat.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.status === 'sukses') {
    loadAlamat();
    showProfileNotif('Alamat berhasil dihapus.', 'sukses');
  }
}

async function setUtama(id) {
  const fd = new FormData();
  fd.append('action', 'utama');
  fd.append('id', id);
  const res = await fetch('../backand/alamat.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.status === 'sukses') loadAlamat();
}

// WISHLIST
async function loadWishlist() {
  try {
    const res  = await fetch('../backand/wishlist.php?action=get');
    const data = await res.json();
    if (data.status === 'sukses') {
      renderWishlist(data.data);
    }
  } catch(e) {
    console.error('Gagal load wishlist:', e);
  }
}

function renderWishlist(items) {
  const grid = document.getElementById('wish-grid');
  const subEl = document.querySelector('#page-wishlist .page-sub');
  if (!grid) return;

  if (subEl) subEl.textContent = items.length + ' item tersimpan';

  if (!items.length) {
    grid.innerHTML = '<p style="font-size:13px;color:var(--muted);padding:1rem 0;grid-column:1/-1;">Wishlist kamu masih kosong.</p>';
    return;
  }

  grid.innerHTML = items.map(item => {
    const imgEl = item.gambar
      ? `<img src="../uploads/produk/${item.gambar}" style="width:100%;height:100%;object-fit:cover;">`
      : `<i class="ti ti-shopping-bag" aria-hidden="true"></i>`;

    const hargaLama = item.harga_lama && item.harga_lama > item.harga
      ? `<span style="text-decoration:line-through;color:var(--muted);font-size:11px;margin-right:6px;">Rp ${parseInt(item.harga_lama).toLocaleString('id-ID')}</span>`
      : '';

    return `
      <div class="wish-card" id="wish-${item.id_produk}" style="position:relative;">
        <button onclick="hapusWishlist(${item.id_produk})" title="Hapus dari wishlist"
          style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.85);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#D85A30;z-index:1;">
          <i class="ti ti-x"></i>
        </button>
        <div class="wish-img">${imgEl}</div>
        <div class="wish-info">
          <div class="wish-cat">${item.kategori || 'Produk'}</div>
          <div class="wish-name">${item.nama}</div>
          <div class="wish-price">${hargaLama}Rp ${parseInt(item.harga).toLocaleString('id-ID')}</div>
          <button onclick="tambahKeKeranjang(${item.id_produk})"
            style="margin-top:8px;width:100%;padding:7px;background:#2C2A26;color:#F5F2EC;border:none;border-radius:2px;cursor:pointer;font-family:'Jost',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;">
            + Keranjang
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function hapusWishlist(idProduk) {
  const fd = new FormData();
  fd.append('action', 'hapus');
  fd.append('id_produk', idProduk);
  const res  = await fetch('../backand/wishlist.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.status === 'sukses') {
    loadWishlist();
    showProfileNotif('Produk dihapus dari wishlist.', 'sukses');
  }
}

async function tambahKeKeranjang(idProduk) {
  const fd = new FormData();
  fd.append('action', 'tambah');
  fd.append('id_produk', idProduk);
  fd.append('qty', 1);
  const res  = await fetch('../backand/keranjang.php', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.status === 'sukses') {
    // Hapus dari wishlist otomatis
    const fd2 = new FormData();
    fd2.append('action', 'hapus');
    fd2.append('id_produk', idProduk);
    await fetch('../backand/wishlist.php', { method: 'POST', body: fd2 });
    loadWishlist();
    showProfileNotif('Produk dipindahkan ke keranjang!', 'sukses');
  } else {
    showProfileNotif(data.pesan || 'Gagal tambah ke keranjang.', 'error');
  }
}

// PAGE NAVIGATION
function goPage(id, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'orders') loadPesanan();
  if (id === 'address') loadAlamat();
  if (id === 'wishlist') loadWishlist();
}

function setFilter(el) {
  const status = el.textContent.trim();
  filterPesanan(status, el);
}

function toggleSwitch(el) { el.classList.toggle('on'); }

function setFilter(el) {
  const status = el.textContent.trim();
  filterPesanan(status, el);
}

function toggleSwitch(el) { el.classList.toggle('on'); }

function previewFoto(input) {
  if (input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const uploadAvatarEl = document.querySelector('.profile-upload-avatar');
      if (uploadAvatarEl) uploadAvatarEl.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}
// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  loadPesanan();

  const saveBtn = document.getElementById('btn-simpan-profil');
  if (saveBtn) saveBtn.addEventListener('click', updateProfile);

  // Tambah alamat button
  const addAddrBtn = document.querySelector('.address-add-button');
  if (addAddrBtn) addAddrBtn.addEventListener('click', () => bukaFormAlamat());

  initPartikel();
});

// ANIMASI PARTIKEL EMAS
function initPartikel() {
  const canvas = document.createElement('canvas');
  canvas.id = 'partikel-canvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 0;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let partikel = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const WARNA = ['#C9A84C', '#E2C97E', '#A07830', '#F0D898', '#B8922E'];

  function buatPartikel() {
    return {
      x:       Math.random() * canvas.width,
      y:       canvas.height + Math.random() * 100,
      r:       Math.random() * 1.8 + 0.4,
      speed:   Math.random() * 0.6 + 0.2,
      opacity: Math.random() * 0.5 + 0.1,
      warna:   WARNA[Math.floor(Math.random() * WARNA.length)],
      drift:   (Math.random() - 0.5) * 0.3,
    };
  }

  for (let i = 0; i < 55; i++) {
    const p = buatPartikel();
    p.y = Math.random() * canvas.height; // sebar awal
    partikel.push(p);
  }

  function animasi() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    partikel.forEach((p, i) => {
      p.y     -= p.speed;
      p.x     += p.drift;
      p.opacity -= 0.0008;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.warna + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
      ctx.fill();

      if (p.y < -10 || p.opacity <= 0) {
        partikel[i] = buatPartikel();
      }
    });

    requestAnimationFrame(animasi);
  }

  animasi();
}