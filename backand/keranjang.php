<?php
session_start();
require_once 'config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$id_user = $_SESSION['user_id'] ?? null;

if (!$id_user && $action !== 'get') {
    echo json_encode(['status' => 'error', 'pesan' => 'Silakan login terlebih dahulu.']);
    exit;
}

//  AMBIL KERANJANG 
if ($action === 'get') {
    if (!$id_user) {
        echo json_encode(['status' => 'sukses', 'data' => []]);
        exit;
    }
    $stmt = $conn->prepare("
        SELECT k.id, k.qty, k.ukuran, k.warna,
               p.id as id_produk, p.nama, p.harga, p.harga_lama, p.gambar, p.stok
        FROM keranjang k
        JOIN produk p ON k.id_produk = p.id
        WHERE k.id_user = ?
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

//  TAMBAH / UPDATE 
elseif ($action === 'tambah') {
    $id_produk = (int)$_POST['id_produk'];
    $qty       = (int)($_POST['qty'] ?? 1);
    $ukuran    = trim($_POST['ukuran'] ?? '');
    $warna     = trim($_POST['warna'] ?? '');

    // Cek udah ada belum
    $cek = $conn->prepare("SELECT id, qty FROM keranjang WHERE id_user=? AND id_produk=? AND ukuran=? AND warna=?");
    $cek->bind_param("iiss", $id_user, $id_produk, $ukuran, $warna);
    $cek->execute();
    $cek->store_result();

    if ($cek->num_rows > 0) {
        // Update qty
        $stmt = $conn->prepare("UPDATE keranjang SET qty = qty + ? WHERE id_user=? AND id_produk=? AND ukuran=? AND warna=?");
        $stmt->bind_param("iiiss", $qty, $id_user, $id_produk, $ukuran, $warna);
    } else {
        // Insert baru
        $stmt = $conn->prepare("INSERT INTO keranjang (id_user, id_produk, qty, ukuran, warna) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iiiss", $id_user, $id_produk, $qty, $ukuran, $warna);
    }

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Produk ditambahkan ke keranjang.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menambahkan ke keranjang.']);
    }
}

//  UPDATE QTY 
elseif ($action === 'update') {
    $id   = (int)$_POST['id'];
    $qty  = (int)$_POST['qty'];

    if ($qty <= 0) {
        $stmt = $conn->prepare("DELETE FROM keranjang WHERE id=? AND id_user=?");
        $stmt->bind_param("ii", $id, $id_user);
    } else {
        $stmt = $conn->prepare("UPDATE keranjang SET qty=? WHERE id=? AND id_user=?");
        $stmt->bind_param("iii", $qty, $id, $id_user);
    }

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal update keranjang.']);
    }
}

//  HAPUS ITEM 
elseif ($action === 'hapus') {
    $id = (int)$_POST['id'];
    $stmt = $conn->prepare("DELETE FROM keranjang WHERE id=? AND id_user=?");
    $stmt->bind_param("ii", $id, $id_user);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Item dihapus dari keranjang.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menghapus item.']);
    }
}

//  KOSONGKAN KERANJANG 
elseif ($action === 'clear') {
    $stmt = $conn->prepare("DELETE FROM keranjang WHERE id_user=?");
    $stmt->bind_param("i", $id_user);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Keranjang dikosongkan.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal mengosongkan keranjang.']);
    }
}