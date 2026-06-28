<?php
session_start();
require_once 'config.php';

$id_user = $_SESSION['user_id'] ?? null;
$action  = $_GET['action'] ?? $_POST['action'] ?? '';

if (!$id_user) {
    echo json_encode(['status' => 'error', 'pesan' => 'Belum login.']);
    exit;
}

// ── AMBIL SEMUA PESANAN USER ──
if ($action === 'get') {
    $stmt = $conn->prepare("
        SELECT p.id, p.total, p.status, p.metode_bayar, p.alamat_pengiriman, p.dibuat,
               COUNT(pi.id) as jumlah_item
        FROM pesanan p
        LEFT JOIN pesanan_item pi ON pi.id_pesanan = p.id
        WHERE p.id_user = ?
        GROUP BY p.id
        ORDER BY p.dibuat DESC
    ");
    $stmt->bind_param("i", $id_user);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode(['status' => 'sukses', 'data' => $data]);
}

// ── AMBIL DETAIL PESANAN ──
elseif ($action === 'detail') {
    $id_pesanan = (int)$_GET['id'];

    // Cek pesanan milik user ini
    $cek = $conn->prepare("SELECT id FROM pesanan WHERE id=? AND id_user=?");
    $cek->bind_param("ii", $id_pesanan, $id_user);
    $cek->execute();
    $cek->store_result();
    if ($cek->num_rows === 0) {
        echo json_encode(['status' => 'error', 'pesan' => 'Pesanan tidak ditemukan.']);
        exit;
    }

    // Ambil header pesanan
    $stmt = $conn->prepare("SELECT * FROM pesanan WHERE id=?");
    $stmt->bind_param("i", $id_pesanan);
    $stmt->execute();
    $pesanan = $stmt->get_result()->fetch_assoc();

    // Ambil item pesanan + gambar produk
    $stmt2 = $conn->prepare("SELECT pi.*, p.gambar FROM pesanan_item pi LEFT JOIN produk p ON p.id = pi.id_produk WHERE pi.id_pesanan=?");
    $stmt2->bind_param("i", $id_pesanan);
    $stmt2->execute();
    $items = [];
    $result2 = $stmt2->get_result();
    while ($row = $result2->fetch_assoc()) {
        $items[] = $row;
    }

    $pesanan['items'] = $items;
    echo json_encode(['status' => 'sukses', 'data' => $pesanan]);
}

// ── BUAT PESANAN BARU (dari checkout) ──
elseif ($action === 'buat') {
    $total             = (int)$_POST['total'];
    $metode_bayar      = trim($_POST['metode_bayar'] ?? '');
    $alamat_pengiriman = trim($_POST['alamat_pengiriman'] ?? '');
    $items             = json_decode($_POST['items'], true);

    if (!$total || !$items) {
        echo json_encode(['status' => 'error', 'pesan' => 'Data pesanan tidak lengkap.']);
        exit;
    }

    // Insert pesanan
    $stmt = $conn->prepare("INSERT INTO pesanan (id_user, total, metode_bayar, alamat_pengiriman) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iiss", $id_user, $total, $metode_bayar, $alamat_pengiriman);
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal membuat pesanan.']);
        exit;
    }

    $id_pesanan = $conn->insert_id;

    // Insert items
    foreach ($items as $item) {
        $stmt2 = $conn->prepare("INSERT INTO pesanan_item (id_pesanan, id_produk, nama_produk, harga, qty, ukuran, warna) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $nama  = $item['nama'];
        $harga = (int)$item['harga'];
        $qty   = (int)$item['qty'];
        $ukuran = $item['ukuran'] ?? '';
        $warna  = $item['warna'] ?? '';
        $stmt2->bind_param("iisiiss", $id_pesanan, $item['id_produk'], $nama, $harga, $qty, $ukuran, $warna);
        $stmt2->execute();

        // Kurangi stok
        $stmt3 = $conn->prepare("UPDATE produk SET stok = stok - ?, terjual = terjual + ? WHERE id = ?");
        $stmt3->bind_param("iii", $qty, $qty, $item['id_produk']);
        $stmt3->execute();
    }

    // Kosongkan keranjang
    $stmt4 = $conn->prepare("DELETE FROM keranjang WHERE id_user=?");
    $stmt4->bind_param("i", $id_user);
    $stmt4->execute();

    echo json_encode(['status' => 'sukses', 'pesan' => 'Pesanan berhasil dibuat.', 'id_pesanan' => $id_pesanan]);
}

// ── TERIMA PESANAN (user konfirmasi diterima) ──
elseif ($action === 'terima') {
    $id_pesanan = (int)$_POST['id_pesanan'];

    $stmt = $conn->prepare("UPDATE pesanan SET status='Diterima' WHERE id=? AND id_user=? AND status='Dikirim'");
    $stmt->bind_param("ii", $id_pesanan, $id_user);

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Pesanan dikonfirmasi diterima.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal mengkonfirmasi pesanan.']);
    }
}

// ── BATALKAN PESANAN ──
elseif ($action === 'batal') {
    $id_pesanan = (int)$_POST['id_pesanan'];

    $stmt = $conn->prepare("UPDATE pesanan SET status='Dibatalkan' WHERE id=? AND id_user=? AND status='Pending'");
    $stmt->bind_param("ii", $id_pesanan, $id_user);

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Pesanan berhasil dibatalkan.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Pesanan tidak bisa dibatalkan.']);
    }
}
// ── SELESAI (setelah user beri ulasan) ──
elseif ($action === 'selesai') {
    $id_pesanan = (int)$_POST['id_pesanan'];

    $stmt = $conn->prepare("UPDATE pesanan SET status='Selesai' WHERE id=? AND id_user=? AND status='Diterima'");
    $stmt->bind_param("ii", $id_pesanan, $id_user);

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Pesanan selesai.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal mengubah status.']);
    }
}

// ── UPDATE STATUS (admin) ──
elseif ($action === 'update_status') {
    $id_pesanan = (int)$_POST['id_pesanan'];
    $status     = trim($_POST['status']);

    $allowed = ['Pending', 'Diproses', 'Dikirim', 'Diterima', 'Dibatalkan'];
    if (!in_array($status, $allowed)) {
        echo json_encode(['status' => 'error', 'pesan' => 'Status tidak valid.']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE pesanan SET status=? WHERE id=?");
    $stmt->bind_param("si", $status, $id_pesanan);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Status pesanan diperbarui.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal memperbarui status.']);
    }
}

// ── AMBIL SEMUA PESANAN (admin) ──
elseif ($action === 'get_all') {
    $result = $conn->query("
        SELECT p.id, p.total, p.status, p.metode_bayar, p.dibuat,
               u.nama_depan, u.nama_belakang, u.no_telp,
               COUNT(pi.id) as jumlah_item
        FROM pesanan p
        JOIN users u ON p.id_user = u.id
        LEFT JOIN pesanan_item pi ON pi.id_pesanan = p.id
        GROUP BY p.id
        ORDER BY p.dibuat DESC
    ");
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode(['status' => 'sukses', 'data' => $data]);
}

elseif ($action === 'admin_detail') {
    $id_pesanan = (int)$_GET['id'];

    $stmt = $conn->prepare("
        SELECT p.*, u.nama_depan, u.nama_belakang, u.no_telp 
        FROM pesanan p 
        JOIN users u ON p.id_user = u.id 
        WHERE p.id=?
    ");
    $stmt->bind_param("i", $id_pesanan);
    $stmt->execute();
    $pesanan = $stmt->get_result()->fetch_assoc();

    if (!$pesanan) {
        echo json_encode(['status' => 'error', 'pesan' => 'Pesanan tidak ditemukan.']);
        exit;
    }

    $stmt2 = $conn->prepare("SELECT * FROM pesanan_item WHERE id_pesanan=?");
    $stmt2->bind_param("i", $id_pesanan);
    $stmt2->execute();
    $items = [];
    $result2 = $stmt2->get_result();
    while ($row = $result2->fetch_assoc()) {
        $items[] = $row;
    }

    $pesanan['items'] = $items;
    echo json_encode(['status' => 'sukses', 'data' => $pesanan]);
}