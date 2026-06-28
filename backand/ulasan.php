<?php
session_start();
require_once 'config.php';

$id_user = $_SESSION['user_id'] ?? null;
$action  = $_GET['action'] ?? $_POST['action'] ?? '';

if (!$id_user) {
    echo json_encode(['status' => 'error', 'pesan' => 'Belum login.']);
    exit;
}

//  AMBIL ULASAN PER PRODUK 
if ($action === 'get') {
    $id_produk = (int)$_GET['id_produk'];

    $stmt = $conn->prepare("
        SELECT u.id, u.rating, u.komentar, u.dibuat,
               usr.nama_depan, usr.nama_belakang, usr.foto
        FROM ulasan u
        JOIN users usr ON usr.id = u.id_user
        WHERE u.id_produk = ?
        ORDER BY u.dibuat DESC
    ");
    $stmt->bind_param("i", $id_produk);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    // Hitung rata-rata rating
    $stmt2 = $conn->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM ulasan WHERE id_produk=?");
    $stmt2->bind_param("i", $id_produk);
    $stmt2->execute();
    $stat = $stmt2->get_result()->fetch_assoc();

    // Hitung distribusi bintang
    $dist = [5=>0, 4=>0, 3=>0, 2=>0, 1=>0];
    foreach ($data as $row) {
        $dist[(int)$row['rating']]++;
    }

    echo json_encode([
        'status' => 'sukses',
        'data'   => $data,
        'avg'    => round($stat['avg_rating'], 1),
        'total'  => (int)$stat['total'],
        'dist'   => $dist
    ]);
}

//  CEK APAKAH USER BISA REVIEW 
elseif ($action === 'cek') {
    $id_produk = (int)$_GET['id_produk'];

    $stmt = $conn->prepare("
        SELECT p.id FROM pesanan p
        JOIN pesanan_item pi ON pi.id_pesanan = p.id
        WHERE p.id_user=? AND pi.id_produk=? AND p.status IN ('Diterima','Selesai')
        AND p.id NOT IN (SELECT id_pesanan FROM ulasan WHERE id_user=? AND id_produk=?)
        LIMIT 1
    ");
    $stmt->bind_param("iiii", $id_user, $id_produk, $id_user, $id_produk);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    if ($row) {
        echo json_encode(['status' => 'sukses', 'bisa_review' => true, 'id_pesanan' => $row['id']]);
    } else {
        echo json_encode(['status' => 'sukses', 'bisa_review' => false]);
    }
}

//  TAMBAH ULASAN 
elseif ($action === 'tambah') {
    $id_produk  = (int)$_POST['id_produk'];
    $id_pesanan = (int)$_POST['id_pesanan'];
    $rating     = (int)$_POST['rating'];
    $komentar   = trim($_POST['komentar'] ?? '');

    if ($rating < 1 || $rating > 5) {
        echo json_encode(['status' => 'error', 'pesan' => 'Rating harus antara 1-5.']);
        exit;
    }

    // Verifikasi pesanan milik user dan sudah Diterima/Selesai
    $cek = $conn->prepare("
        SELECT p.id FROM pesanan p
        JOIN pesanan_item pi ON pi.id_pesanan = p.id
        WHERE p.id=? AND p.id_user=? AND pi.id_produk=? AND p.status IN ('Diterima','Selesai')
    ");
    $cek->bind_param("iii", $id_pesanan, $id_user, $id_produk);
    $cek->execute();
    $cek->store_result();

    if ($cek->num_rows === 0) {
        echo json_encode(['status' => 'error', 'pesan' => 'Kamu belum bisa mengulas produk ini.']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO ulasan (id_user, id_produk, id_pesanan, rating, komentar) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("iiiss", $id_user, $id_produk, $id_pesanan, $rating, $komentar);
    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Ulasan berhasil ditambahkan.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menambahkan ulasan.']);
    }
}

//  HAPUS ULASAN 
elseif ($action === 'hapus') {
    $id = (int)$_POST['id'];

    $stmt = $conn->prepare("DELETE FROM ulasan WHERE id=? AND id_user=?");
    $stmt->bind_param("ii", $id, $id_user);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Ulasan berhasil dihapus.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menghapus ulasan.']);
    }
}