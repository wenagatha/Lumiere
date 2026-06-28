// ============================================================
//  lumiere-payment.js  —  Full database sync version
//  Flow: keranjang.php (get) → render → pesanan.php (buat)
// ============================================================

//  STATE ─
let cartItems      = [];          // data dari keranjang.php
let subtotal       = 0;           // jumlah harga * qty
let discountPromo  = 0;           // promo hardcode (bisa diganti API kupon)
let selectedShipping = { name: 'JNE Regular', price: 35000, id: 'jne', label: 'JNE' };
let selectedMethod   = 'va';
let selectedBank     = null;
let selectedEwallet  = null;
let selectedAddress  = null;      // akan diisi setelah loadAddress()

//  FORMAT RUPIAH 
function formatRp(value) {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(value);
}

//  HITUNG GRAND TOTAL 
function getGrandTotal() {
  return subtotal - discountPromo + selectedShipping.price;
}

//  UPDATE TAMPILAN TOTAL DI SIDEBAR ─
function updateSummaryDisplay() {
  const discountProduk = cartItems.reduce((sum, item) => {
    const selisih = item.harga_lama ? (item.harga_lama - item.harga) * item.qty : 0;
    return sum + selisih;
  }, 0);

  const grandTotal = subtotal - discountProduk - discountPromo + selectedShipping.price;

  // Update elemen di sidebar
  const elSubtotal   = document.getElementById('summarySubtotal');
  const elDiskon     = document.getElementById('summaryDiskon');
  const elPromo      = document.getElementById('summaryPromo');
  const elShipping   = document.getElementById('shippingDisplay');
  const elGrandTotal = document.getElementById('grandTotal');
  const elRowDiskon  = document.getElementById('rowDiskon');
  const elRowPromo   = document.getElementById('rowPromo');

  if (elSubtotal)   elSubtotal.textContent   = `Rp ${formatRp(subtotal)}`;
  if (elShipping)   elShipping.textContent   = selectedShipping.price === 0 ? 'Gratis' : `Rp ${formatRp(selectedShipping.price)}`;
  if (elGrandTotal) elGrandTotal.textContent = `Rp ${formatRp(grandTotal)}`;

  // Diskon produk (dari harga_lama vs harga)
  if (elDiskon && elRowDiskon) {
    if (discountProduk > 0) {
      elDiskon.textContent   = `−Rp ${formatRp(discountProduk)}`;
      elRowDiskon.style.display = '';
    } else {
      elRowDiskon.style.display = 'none';
    }
  }

  // Promo kupon
  if (elPromo && elRowPromo) {
    if (discountPromo > 0) {
      elPromo.textContent   = `−Rp ${formatRp(discountPromo)}`;
      elRowPromo.style.display = '';
    } else {
      elRowPromo.style.display = 'none';
    }
  }

  // Simpan grand total ke dataset tombol bayar (buat dikirim ke backend)
  const btnPay = document.getElementById('btnPay');
  if (btnPay) btnPay.dataset.grandTotal = grandTotal;
}

//  LOAD KERANJANG DARI BACKEND ─
async function loadCart() {
  try {
    const res  = await fetch('../backand/keranjang.php?action=get');
    const json = await res.json();

    if (json.status !== 'sukses' || !json.data.length) {
      showEmptyCart();
      return;
    }

    cartItems = json.data;
    subtotal  = cartItems.reduce((sum, item) => sum + item.harga * item.qty, 0);

    renderCartItems();
    updateSummaryDisplay();
  } catch (err) {
    console.error('Gagal load keranjang:', err);
    showEmptyCart();
  }
}

//  RENDER ITEM DI SIDEBAR 
function renderCartItems() {
  const container = document.getElementById('itemsMini');
  if (!container) return;

  container.innerHTML = cartItems.map(item => {
    const imgSrc = item.gambar
      ? `../uploads/produk/${item.gambar}`
      : null;

    const imgEl = imgSrc
      ? `<img src="${imgSrc}" alt="${item.nama}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;">`
      : `<i class="ti ti-shopping-bag" aria-hidden="true"></i>`;

    const varian = [item.warna, item.ukuran].filter(Boolean).join(', ');

    return `
      <div class="mini-item">
        <div class="mini-img">${imgEl}</div>
        <div class="mini-name">
          ${item.nama}
          <br><span style="font-size:10px;color:var(--muted);font-weight:400;">×${item.qty}${varian ? ' · ' + varian : ''}</span>
        </div>
        <div class="mini-price">Rp ${formatRp(item.harga * item.qty)}</div>
      </div>
    `;
  }).join('');
}

function showEmptyCart() {
  const container = document.getElementById('itemsMini');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem 0;color:var(--muted);font-size:13px;">
        Keranjang kosong.<br>
        <a href="all-products.html" style="color:var(--gold);">Belanja sekarang</a>
      </div>
    `;
  }
  // Disable tombol bayar
  const btnPay = document.getElementById('btnPay');
  if (btnPay) {
    btnPay.disabled = true;
    btnPay.style.opacity = '0.5';
  }
}

//  LOAD ALAMAT USER 
async function loadAddress() {
  try {
    const res  = await fetch('../backand/alamat.php?action=get');
    const json = await res.json();

    if (json.status !== 'sukses' || !json.data.length) return;

    const addresses = json.data;
    const container = document.getElementById('addrListContainer');
    if (!container) return;

    // Hapus card hardcode yang ada di HTML (ganti dengan data dari DB)
    container.querySelectorAll('.addr-card:not(#addrCustomCard)').forEach(el => el.remove());

    const customCard = document.getElementById('addrCustomCard');
    addresses.forEach((addr, i) => {
      const isUtama = addr.is_utama == 1;
      // Kolom sesuai alamat.php: nama_penerima, no_telp, alamat, kota, provinsi, kode_pos
      const alamatLengkap = [addr.alamat, addr.kota, addr.provinsi, addr.kode_pos].filter(Boolean).join(', ');

      const card = document.createElement('div');
      card.className = 'addr-card' + (i === 0 ? ' selected' : '');
      card.setAttribute('onclick', 'selectAddr(this)');
      card.dataset.addrId   = addr.id;

      card.innerHTML = `
        <div class="radio-dot"><div class="radio-inner"></div></div>
        <div style="flex:1;">
          <div class="addr-name">${addr.nama_penerima} · ${addr.no_telp}</div>
          <div class="addr-text">${alamatLengkap}</div>
        </div>
        ${isUtama ? '<span class="addr-primary-badge">Utama</span>' : ''}
      `;

      container.insertBefore(card, customCard);
    });

    // Set alamat terpilih default = alamat pertama (sudah diurutkan is_utama DESC dari backend)
    const first = addresses[0];
    const alamatFirst = [first.alamat, first.kota, first.provinsi, first.kode_pos].filter(Boolean).join(', ');
    selectedAddress = `${first.nama_penerima} · ${first.no_telp}\n${alamatFirst}`;

  } catch (err) {
    console.warn('Alamat tidak bisa dimuat dari backend, pakai hardcode:', err);
    const firstCard = document.querySelector('.addr-card.selected .addr-text');
    if (firstCard) selectedAddress = firstCard.textContent.trim();
  }
}

//  PILIH ALAMAT 
function selectAddr(element) {
  document.querySelectorAll('.addr-card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');
  pulseSelect(element);

  // Ambil teks alamat dari card yang dipilih
  const addrText = element.querySelector('.addr-text');
  const addrName = element.querySelector('.addr-name');
  if (addrText) {
    selectedAddress = (addrName ? addrName.textContent.trim() + '\n' : '') + addrText.textContent.trim();
  }

  // Sembunyikan form custom kalau bukan card custom
  if (element.id !== 'addrCustomCard') {
    const form = document.getElementById('customAddrForm');
    if (form) form.style.display = 'none';
  }
}

function selectAddrCustom(element) {
  document.querySelectorAll('.addr-card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');
  const form = document.getElementById('customAddrForm');
  if (form) form.style.display = 'block';
  selectedAddress = null; // Reset sampai form diisi
}

function updateCustomPreview() {
  const name     = document.getElementById('customName')?.value || '';
  const phone    = document.getElementById('customPhone')?.value || '';
  const street   = document.getElementById('customStreet')?.value || '';
  const district = document.getElementById('customDistrict')?.value || '';
  const city     = document.getElementById('customCity')?.value || '';
  const province = document.getElementById('customProvince')?.value || '';
  const postal   = document.getElementById('customPostal')?.value || '';

  const preview     = name && phone ? `${name} · ${phone}` : 'Alamat tidak lengkap';
  const addressLine = [street, district, city, province, postal].filter(Boolean).join(', ');

  const previewEl = document.getElementById('addrCustomPreview');
  if (previewEl) previewEl.innerHTML = `${preview}<br>${addressLine}`;
}

function saveCustomAddr() {
  const name     = document.getElementById('customName')?.value.trim() || '';
  const phone    = document.getElementById('customPhone')?.value.trim() || '';
  const street   = document.getElementById('customStreet')?.value.trim() || '';
  const district = document.getElementById('customDistrict')?.value.trim() || '';
  const city     = document.getElementById('customCity')?.value.trim() || '';
  const province = document.getElementById('customProvince')?.value.trim() || '';
  const postal   = document.getElementById('customPostal')?.value.trim() || '';

  if (!name || !phone || !street || !city) {
    alert('Harap lengkapi nama, nomor telepon, alamat jalan, dan kota.');
    return;
  }

  selectedAddress = `${name} · ${phone}\n${[street, district, city, province, postal].filter(Boolean).join(', ')}`;
  updateCustomPreview();

  const form = document.getElementById('customAddrForm');
  if (form) form.style.display = 'none';
  alert('Alamat telah disimpan.');
}

function cancelCustomAddr() {
  const form = document.getElementById('customAddrForm');
  if (form) form.style.display = 'none';
}

//  PILIH PENGIRIMAN 
function selectShipping(element, id, name, price) {
  document.querySelectorAll('.shipping-option').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
  pulseSelect(element);
  selectedShipping = { id, name, price };
  updateSummaryDisplay();
}

//  SWITCH METODE PEMBAYARAN ─
function switchMethod(method, element) {
  document.querySelectorAll('.mtab').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');

  document.querySelectorAll('.pay-section').forEach(sec => sec.classList.remove('active'));
  const section = document.getElementById(`sec-${method}`);
  if (section) section.classList.add('active');

  selectedMethod = method;
}

function selectBank(element, id, name, vaNumber, label, bg, fg, desc) {
  document.querySelectorAll('#sec-va .option-row').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
  pulseSelect(element);
  selectedBank = { id, name, vaNumber, label, bg, fg, desc };
}

function selectEwallet(element, id, name, bg, fg, desc) {
  document.querySelectorAll('#sec-ewallet .option-row').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
  pulseSelect(element);
  selectedEwallet = { id, name, bg, fg, desc };
}

function copyVA(button, text) {
  navigator.clipboard.writeText(text).then(() => {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="ti ti-check"></i> Disalin!';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    alert('Gagal menyalin. Silakan coba lagi.');
  });
}

//  VALIDASI SEBELUM BAYAR 
function validateBeforePay() {
  if (!cartItems.length) {
    alert('Keranjang kosong. Silakan tambah produk terlebih dahulu.');
    return false;
  }

  if (!selectedAddress) {
    alert('Harap pilih atau isi alamat pengiriman terlebih dahulu.');
    return false;
  }

  if (selectedMethod === 'va' && !selectedBank) {
    alert('Harap pilih bank Virtual Account terlebih dahulu.');
    return false;
  }

  if (selectedMethod === 'ewallet' && !selectedEwallet) {
    alert('Harap pilih e-wallet terlebih dahulu.');
    return false;
  }

  return true;
}

//  HANDLE KLIK BAYAR ─
function handlePay() {
  if (!validateBeforePay()) return;

  if (selectedMethod === 'va')      showVAModal();
  else if (selectedMethod === 'ewallet') showEwalletModal();
  else if (selectedMethod === 'qris')    showQrisModal();
}

//  KIRIM PESANAN KE DATABASE 
async function submitPesanan() {
  const discountProduk = cartItems.reduce((sum, item) => {
    const selisih = item.harga_lama ? (item.harga_lama - item.harga) * item.qty : 0;
    return sum + selisih;
  }, 0);
  const grandTotal = subtotal - discountProduk - discountPromo + selectedShipping.price;

  // Tentukan label metode bayar
  let metodeBayar = '';
  if (selectedMethod === 'va')      metodeBayar = `VA ${selectedBank.name}`;
  else if (selectedMethod === 'ewallet') metodeBayar = selectedEwallet.name;
  else if (selectedMethod === 'qris')    metodeBayar = 'QRIS';

  // Siapkan items payload
  const itemsPayload = cartItems.map(item => ({
    id_produk : item.id_produk,
    nama      : item.nama,
    harga     : item.harga,
    qty       : item.qty,
    ukuran    : item.ukuran || '',
    warna     : item.warna  || ''
  }));

  const body = new FormData();
  body.append('action',            'buat');
  body.append('total',             grandTotal);
  body.append('metode_bayar',      metodeBayar);
  body.append('alamat_pengiriman', selectedAddress);
  body.append('items',             JSON.stringify(itemsPayload));

  try {
    const res  = await fetch('../backand/pesanan.php', { method: 'POST', body });
    const json = await res.json();

    if (json.status === 'sukses') {
      return { sukses: true, id_pesanan: json.id_pesanan, grandTotal };
    } else {
      alert('Gagal membuat pesanan: ' + json.pesan);
      return { sukses: false };
    }
  } catch (err) {
    console.error('Submit pesanan error:', err);
    alert('Terjadi kesalahan koneksi. Coba lagi.');
    return { sukses: false };
  }
}

//  CLOSE MODAL 
function closeModal() {
  const modal = document.getElementById('payModal');
  if (modal) modal.classList.remove('show');
}

//  HELPER RENDER MODAL 
function getModalEls() {
  return {
    title  : document.getElementById('modalTitle'),
    body   : document.getElementById('modalBody'),
    footer : document.getElementById('modalFooter'),
    modal  : document.getElementById('payModal')
  };
}

//  MODAL VA 
function showVAModal() {
  const bank = selectedBank;
  if (!bank) return;

  const discountProduk = cartItems.reduce((sum, item) => {
    return sum + (item.harga_lama ? (item.harga_lama - item.harga) * item.qty : 0);
  }, 0);
  const grandTotal = subtotal - discountProduk - discountPromo + selectedShipping.price;

  const { title, body, footer, modal } = getModalEls();
  if (!title || !body || !footer) return;

  title.textContent = `Instruksi Pembayaran • ${bank.name}`;

  body.innerHTML = `
    <div class="modal-provider-badge">
      <div class="modal-provider-logo" style="background:${bank.bg};color:${bank.fg};">${bank.label}</div>
      <div>
        <div class="modal-provider-name">${bank.name}</div>
        <div style="font-size:11px;color:var(--muted);">${bank.desc}</div>
      </div>
    </div>
    <div class="modal-info-label">Nomor Virtual Account</div>
    <div class="va-display">
      <span>${bank.vaNumber}</span>
      <button class="copy-btn" onclick="copyVA(this,'${bank.vaNumber}')">
        <i class="ti ti-copy"></i> Salin
      </button>
    </div>
    <div style="background:var(--cream-dark);padding:12px;border-radius:2px;margin-bottom:1rem;">
      <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Total Pembayaran</div>
      <div style="font-size:22px;font-weight:500;">Rp ${formatRp(grandTotal)}</div>
    </div>
    <p class="modal-note">
      <strong>Cara bayar:</strong> Transfer ke nomor VA di atas melalui m-banking, ATM, atau teller bank.<br>
      Pembayaran akan otomatis terkonfirmasi setelah transfer berhasil.
    </p>
  `;

  footer.innerHTML = `
    <button class="mbtn mbtn-secondary" onclick="closeModal()">Tutup</button>
    <button class="mbtn mbtn-primary" id="btnKonfirmasi" onclick="handleKonfirmasi()">
      <i class="ti ti-check" style="margin-right:6px;"></i> Konfirmasi Pembayaran
    </button>
  `;

  modal.classList.add('show');
}

//  MODAL E-WALLET 
function showEwalletModal() {
  const ew = selectedEwallet;
  if (!ew) return;

  const discountProduk = cartItems.reduce((sum, item) => {
    return sum + (item.harga_lama ? (item.harga_lama - item.harga) * item.qty : 0);
  }, 0);
  const grandTotal = subtotal - discountProduk - discountPromo + selectedShipping.price;

  const { title, body, footer, modal } = getModalEls();
  if (!title || !body || !footer) return;

  title.textContent = `Instruksi Pembayaran • ${ew.name}`;

  body.innerHTML = `
    <div class="modal-provider-badge">
      <div class="modal-provider-logo" style="background:${ew.bg};color:${ew.fg};font-size:10px;">${ew.name}</div>
      <div>
        <div class="modal-provider-name">${ew.name}</div>
        <div style="font-size:11px;color:var(--muted);">${ew.desc}</div>
      </div>
    </div>
    <div class="modal-info-label">Nomor Merchant</div>
    <div class="va-display">
      <span>0837 9142 0414</span>
      <button class="copy-btn" onclick="copyVA(this,'085773420878')">
        <i class="ti ti-copy"></i> Salin
      </button>
    </div>
    <div style="background:var(--cream-dark);padding:12px;border-radius:2px;margin-bottom:1rem;">
      <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Total Pembayaran</div>
      <div style="font-size:22px;font-weight:500;">Rp ${formatRp(grandTotal)}</div>
    </div>
    <p class="modal-note">
      <strong>Langkah-langkah:</strong><br>
      1. Buka aplikasi ${ew.name}<br>
      2. Transfer ke nomor di atas<br>
      3. Masukkan jumlah Rp ${formatRp(grandTotal)}<br>
      4. Selesaikan pembayaran
    </p>
  `;

  footer.innerHTML = `
    <button class="mbtn mbtn-secondary" onclick="closeModal()">Tutup</button>
    <button class="mbtn mbtn-primary" id="btnKonfirmasi" onclick="handleKonfirmasi()">
      <i class="ti ti-check" style="margin-right:6px;"></i> Konfirmasi Pembayaran
    </button>
  `;

  modal.classList.add('show');
}

//  MODAL QRIS 
function showQrisModal() {
  const discountProduk = cartItems.reduce((sum, item) => {
    return sum + (item.harga_lama ? (item.harga_lama - item.harga) * item.qty : 0);
  }, 0);
  const grandTotal = subtotal - discountProduk - discountPromo + selectedShipping.price;

  const { title, body, footer, modal } = getModalEls();
  if (!title || !body || !footer) return;

  title.textContent = 'Scan QRIS Lumière';

  body.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:1rem;">
        Scan dengan aplikasi pembayaran apapun
      </div>
      <div style="display:inline-block;padding:16px;background:#fff;border:0.5px solid var(--border);border-radius:4px;margin-bottom:1.5rem;">
        <div style="font-size:80px;margin:20px;">📱</div>
        <div style="font-size:12px;color:var(--muted);">QR Code Lumière</div>
      </div>
      <div style="background:var(--cream-dark);padding:12px;border-radius:2px;margin-bottom:1rem;">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Total Pembayaran</div>
        <div style="font-size:22px;font-weight:500;">Rp ${formatRp(grandTotal)}</div>
      </div>
      <p class="modal-note">
        <strong>Berlaku untuk:</strong> Semua e-wallet dan mobile banking dengan logo QRIS
      </p>
    </div>
  `;

  footer.innerHTML = `
    <button class="mbtn mbtn-secondary" onclick="closeModal()">Tutup</button>
    <button class="mbtn mbtn-primary" id="btnKonfirmasi" onclick="handleKonfirmasi()">
      <i class="ti ti-check" style="margin-right:6px;"></i> Konfirmasi Pembayaran
    </button>
  `;

  modal.classList.add('show');
}

//  HANDLE KONFIRMASI → KIRIM KE DB 
async function handleKonfirmasi() {
  const btn = document.getElementById('btnKonfirmasi');
  if (btn) {
    btn.disabled     = true;
    btn.innerHTML    = '<i class="ti ti-loader" style="margin-right:6px;"></i> Memproses...';
  }

  const result = await submitPesanan();

  if (result.sukses) {
    showSuccessModal(result.id_pesanan, result.grandTotal);
  } else {
    // Re-enable tombol kalau gagal
    if (btn) {
      btn.disabled  = false;
      btn.innerHTML = '<i class="ti ti-check" style="margin-right:6px;"></i> Konfirmasi Pembayaran';
    }
  }
}

//  MODAL SUKSES ─
function showSuccessModal(id_pesanan, grandTotal) {
  const nomorPesanan = `LMR-${id_pesanan.toString().padStart(8, '0')}`;

  const { title, body, footer, modal } = getModalEls();
  if (!title || !body || !footer) return;

  title.textContent = 'Pembayaran Berhasil!';

  body.innerHTML = `
    <div style="text-align:center;">
      <div class="success-icon"><i class="ti ti-check"></i></div>
      <h2 class="success-title">Terima Kasih!</h2>
      <p class="success-desc">
        Pembayaran sebesar <strong>Rp ${formatRp(grandTotal)}</strong> telah berhasil kami terima.
      </p>
      <div class="success-order">PESANAN #${nomorPesanan}</div>
      <p class="modal-note" style="margin-bottom:1rem;">
        Pesanan Anda sedang diproses. Detail pengiriman akan kami kirimkan dalam 24 jam ke email dan WhatsApp Anda.
      </p>
    </div>
  `;

  footer.innerHTML = `
    <button class="mbtn mbtn-primary" onclick="window.location.href='lumiere-home.html'" style="width:100%;">
      <i class="ti ti-home" style="margin-right:6px;"></i> Kembali ke Beranda
    </button>
  `;

  modal.classList.add('show');
}

//  ANIMASI VISUAL PILIHAN (Visual only) 
function pulseSelect(el) {
  el.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
  el.style.transform = 'scale(1.012)';
  el.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.5), 0 0 20px rgba(201,168,76,0.2)';
  setTimeout(() => {
    el.style.transform = '';
    el.style.boxShadow = '';
  }, 300);
}

//  INIT 
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadCart(), loadAddress()]);
});

//  PARTICLES (Visual only — dark luxury theme) 
//  PARTICLES (Visual only — dark luxury theme) 
document.addEventListener('DOMContentLoaded', function () {
  const bg = document.getElementById('bg-payment');
  if (!bg) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      bottom:-10px; opacity:0;
      animation-duration:${10 + Math.random() * 15}s;
      animation-delay:${Math.random() * 12}s;
    `;
    bg.appendChild(p);
  }
});