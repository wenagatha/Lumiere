<?php
session_start();
require_once 'config.php';

$id_user = $_SESSION['user_id'] ?? null;
$action  = $_GET['action'] ?? $_POST['action'] ?? '';

if (!$id_user) {
    echo json_encode(['status' => 'error', 'pesan' => 'Belum login.']);
    exit;
}

//  AMBIL WISHLIST USER 
if ($action === 'get') {
    $stmt = $conn->prepare("
        SELECT w.id, w.id_produk, w.dibuat,
               p.nama, p.harga, p.harga_lama, p.kategori, p.gambar, p.stok
        FROM wishlist w
        JOIN produk p ON p.id = w.id_produk
        WHERE w.id_user = ?
        ORDER BY w.dibuat DESC
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

//  TAMBAH KE WISHLIST 
elseif ($action === 'tambah') {
    $id_produk = (int)$_POST['id_produk'];

    if (!$id_produk) {
        echo json_encode(['status' => 'error', 'pesan' => 'Produk tidak valid.']);
        exit;
    }

    $stmt = $conn->prepare("INSERT IGNORE INTO wishlist (id_user, id_produk) VALUES (?, ?)");
    $stmt->bind_param("ii", $id_user, $id_produk);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Produk ditambahkan ke wishlist.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menambahkan ke wishlist.']);
    }
}

//  HAPUS DARI WISHLIST 
elseif ($action === 'hapus') {
    $id_produk = (int)$_POST['id_produk'];

    $stmt = $conn->prepare("DELETE FROM wishlist WHERE id_user=? AND id_produk=?");
    $stmt->bind_param("ii", $id_user, $id_produk);

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Produk dihapus dari wishlist.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menghapus dari wishlist.']);
    }
}

//  CEK APAKAH PRODUK ADA DI WISHLIST 
elseif ($action === 'cek') {
    $id_produk = (int)$_GET['id_produk'];

    $stmt = $conn->prepare("SELECT id FROM wishlist WHERE id_user=? AND id_produk=?");
    $stmt->bind_param("ii", $id_user, $id_produk);
    $stmt->execute();
    $stmt->store_result();

    echo json_encode(['status' => 'sukses', 'ada' => $stmt->num_rows > 0]);
}

//  TOGGLE WISHLIST 
elseif ($action === 'toggle') {
    $id_produk = (int)$_POST['id_produk'];

    if (!$id_produk) {
        echo json_encode(['status' => 'error', 'pesan' => 'Produk tidak valid.']);
        exit;
    }

    $cek = $conn->prepare("SELECT id FROM wishlist WHERE id_user=? AND id_produk=?");
    $cek->bind_param("ii", $id_user, $id_produk);
    $cek->execute();
    $cek->store_result();

    if ($cek->num_rows > 0) {
        $stmt = $conn->prepare("DELETE FROM wishlist WHERE id_user=? AND id_produk=?");
        $stmt->bind_param("ii", $id_user, $id_produk);
        $stmt->execute();
        echo json_encode(['status' => 'sukses', 'aksi' => 'dihapus', 'pesan' => 'Dihapus dari wishlist.']);
    } else {
        $stmt = $conn->prepare("INSERT INTO wishlist (id_user, id_produk) VALUES (?, ?)");
        $stmt->bind_param("ii", $id_user, $id_produk);
        $stmt->execute();
        echo json_encode(['status' => 'sukses', 'aksi' => 'ditambah', 'pesan' => 'Ditambahkan ke wishlist.']);
    }
}