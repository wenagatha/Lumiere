<?php
session_start();
require_once 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$id_user = $_SESSION['user_id'] ?? null;

if (!$id_user) {
    echo json_encode(['status' => 'error', 'pesan' => 'Belum login.']);
    exit;
}

if ($action === 'get') {
    $stmt = $conn->prepare("SELECT id, nama_depan, nama_belakang, email, no_telp, role, terdaftar FROM users WHERE id = ?");
    $stmt->bind_param("i", $id_user);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    if ($user) {
        echo json_encode(['status' => 'sukses', 'data' => $user]);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'User tidak ditemukan.']);
    }
}

//  KHUSUS ADMIN: ambil semua customer + jumlah order (dipakai halaman Akun Customer & dashboard) 
if ($action === 'get_all') {
    // pastikan yang request adalah admin
    $cekRole = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $cekRole->bind_param("i", $id_user);
    $cekRole->execute();
    $roleRow = $cekRole->get_result()->fetch_assoc();

    if (!$roleRow || $roleRow['role'] !== 'admin') {
        echo json_encode(['status' => 'error', 'pesan' => 'Akses ditolak.']);
        exit;
    }

    $result = $conn->query("
        SELECT u.id, u.nama_depan, u.nama_belakang, u.email, u.terdaftar, u.status,
               COUNT(p.id) AS jumlah_order
        FROM users u
        LEFT JOIN pesanan p ON p.id_user = u.id
        WHERE u.role = 'customer'
        GROUP BY u.id
        ORDER BY u.terdaftar DESC
    ");
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode(['status' => 'sukses', 'data' => $data]);
}

//  KHUSUS ADMIN: blokir / aktifkan akun customer 
if ($action === 'toggle_status') {
    // pastikan yang request adalah admin
    $cekRole = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $cekRole->bind_param("i", $id_user);
    $cekRole->execute();
    $roleRow = $cekRole->get_result()->fetch_assoc();

    if (!$roleRow || $roleRow['role'] !== 'admin') {
        echo json_encode(['status' => 'error', 'pesan' => 'Akses ditolak.']);
        exit;
    }

    $id_target = (int)($_POST['id'] ?? 0);
    if (!$id_target) {
        echo json_encode(['status' => 'error', 'pesan' => 'ID customer tidak valid.']);
        exit;
    }

    $cek = $conn->prepare("SELECT status FROM users WHERE id = ? AND role = 'customer'");
    $cek->bind_param("i", $id_target);
    $cek->execute();
    $target = $cek->get_result()->fetch_assoc();

    if (!$target) {
        echo json_encode(['status' => 'error', 'pesan' => 'Customer tidak ditemukan.']);
        exit;
    }

    $statusBaru = ($target['status'] === 'aktif') ? 'diblokir' : 'aktif';

    $update = $conn->prepare("UPDATE users SET status = ? WHERE id = ?");
    $update->bind_param("si", $statusBaru, $id_target);

    if ($update->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Status akun diperbarui.', 'status_baru' => $statusBaru]);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal memperbarui status akun.']);
    }
}