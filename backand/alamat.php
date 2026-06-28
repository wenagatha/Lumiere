<?php
session_start();
require_once 'config.php';

$id_user = $_SESSION['user_id'] ?? null;
$action  = $_GET['action'] ?? $_POST['action'] ?? '';

if (!$id_user) {
    echo json_encode(['status' => 'error', 'pesan' => 'Belum login.']);
    exit;
}

// ── AMBIL SEMUA ALAMAT ──
if ($action === 'get') {
    $stmt = $conn->prepare("SELECT * FROM alamat WHERE id_user=? ORDER BY is_utama DESC");
    $stmt->bind_param("i", $id_user);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode(['status' => 'sukses', 'data' => $data]);
}

// ── TAMBAH ALAMAT ──
elseif ($action === 'tambah') {
    $nama_penerima = trim($_POST['nama_penerima']);
    $no_telp       = trim($_POST['no_telp']);
    $alamat        = trim($_POST['alamat']);
    $kota          = trim($_POST['kota']);
    $provinsi      = trim($_POST['provinsi']);
    $kode_pos      = trim($_POST['kode_pos'] ?? '');
    $is_utama      = isset($_POST['is_utama']) ? 1 : 0;

    if (!$nama_penerima || !$no_telp || !$alamat || !$kota || !$provinsi) {
        echo json_encode(['status' => 'error', 'pesan' => 'Lengkapi semua field alamat.']);
        exit;
    }

    // Kalau is_utama, reset dulu yang lain
    if ($is_utama) {
        $conn->query("UPDATE alamat SET is_utama=0 WHERE id_user=$id_user");
    }

    $stmt = $conn->prepare("INSERT INTO alamat (id_user, nama_penerima, no_telp, alamat, kota, provinsi, kode_pos, is_utama) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("issssssi", $id_user, $nama_penerima, $no_telp, $alamat, $kota, $provinsi, $kode_pos, $is_utama);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Alamat berhasil ditambahkan.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menambahkan alamat.']);
    }
}

// ── EDIT ALAMAT ──
elseif ($action === 'edit') {
    $id            = (int)$_POST['id'];
    $nama_penerima = trim($_POST['nama_penerima']);
    $no_telp       = trim($_POST['no_telp']);
    $alamat        = trim($_POST['alamat']);
    $kota          = trim($_POST['kota']);
    $provinsi      = trim($_POST['provinsi']);
    $kode_pos      = trim($_POST['kode_pos'] ?? '');
    $is_utama      = isset($_POST['is_utama']) ? 1 : 0;

    if ($is_utama) {
        $conn->query("UPDATE alamat SET is_utama=0 WHERE id_user=$id_user");
    }

    $stmt = $conn->prepare("UPDATE alamat SET nama_penerima=?, no_telp=?, alamat=?, kota=?, provinsi=?, kode_pos=?, is_utama=? WHERE id=? AND id_user=?");
    $stmt->bind_param("sssssssii", $nama_penerima, $no_telp, $alamat, $kota, $provinsi, $kode_pos, $is_utama, $id, $id_user);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Alamat berhasil diperbarui.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal memperbarui alamat.']);
    }
}

// ── HAPUS ALAMAT ──
elseif ($action === 'hapus') {
    $id = (int)$_POST['id'];

    $stmt = $conn->prepare("DELETE FROM alamat WHERE id=? AND id_user=?");
    $stmt->bind_param("ii", $id, $id_user);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Alamat berhasil dihapus.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menghapus alamat.']);
    }
}

// ── SET ALAMAT UTAMA ──
elseif ($action === 'utama') {
    $id = (int)$_POST['id'];

    $conn->query("UPDATE alamat SET is_utama=0 WHERE id_user=$id_user");
    $stmt = $conn->prepare("UPDATE alamat SET is_utama=1 WHERE id=? AND id_user=?");
    $stmt->bind_param("ii", $id, $id_user);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Alamat utama diperbarui.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal mengatur alamat utama.']);
    }
}