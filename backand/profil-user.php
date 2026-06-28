<?php
session_start();
require_once 'config.php';

$id_user = $_SESSION['user_id'] ?? null;

if (!$id_user) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'pesan' => 'Belum login.']);
    exit;
}

//  GET PROFIL 
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $conn->prepare("SELECT id, nama_depan, nama_belakang, email, no_telp, foto, role, terdaftar FROM users WHERE id = ?");
    $stmt->bind_param("i", $id_user);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user) {
        $user['initials'] = strtoupper(substr($user['nama_depan'], 0, 1) . substr($user['nama_belakang'], 0, 1));
        echo json_encode(['status' => 'sukses', 'data' => $user]);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'User tidak ditemukan.']);
    }
}

//  UPDATE PROFIL 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama_depan    = trim($_POST['nama_depan'] ?? '');
    $nama_belakang = trim($_POST['nama_belakang'] ?? '');
    $no_telp       = trim($_POST['no_telp'] ?? '');

    if (!$nama_depan || !$nama_belakang) {
        echo json_encode(['status' => 'error', 'pesan' => 'Nama depan dan belakang harus diisi.']);
        exit;
    }

    // Upload foto kalau ada
    $foto_query = '';
    $foto = '';
    if (!empty($_FILES['foto']['name'])) {
        $ext      = pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION);
        $filename = 'user_' . $id_user . '_' . time() . '.' . $ext;
        $target   = '../uploads/user/' . $filename;
        if (move_uploaded_file($_FILES['foto']['tmp_name'], $target)) {
            $foto = $filename;
        }
    }

    if ($foto) {
        $stmt = $conn->prepare("UPDATE users SET nama_depan=?, nama_belakang=?, no_telp=?, foto=? WHERE id=?");
        $stmt->bind_param("ssssi", $nama_depan, $nama_belakang, $no_telp, $foto, $id_user);
    } else {
        $stmt = $conn->prepare("UPDATE users SET nama_depan=?, nama_belakang=?, no_telp=? WHERE id=?");
        $stmt->bind_param("sssi", $nama_depan, $nama_belakang, $no_telp, $id_user);
    }

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Profil berhasil diperbarui.', 'foto' => $foto]);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal memperbarui profil.']);
    }
}