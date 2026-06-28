<?php
session_start();
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim($_POST['email']);
    $password = $_POST['password'];

    $stmt = $conn->prepare("SELECT id, nama_depan, password, role, status, foto FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user   = $result->fetch_assoc();

    if (!$user) {
        echo json_encode(['status' => 'error', 'pesan' => 'Email tidak ditemukan.']);
        exit;
    }

    if ($user['status'] === 'diblokir') {
        echo json_encode(['status' => 'error', 'pesan' => 'Akun kamu diblokir.']);
        exit;
    }

    if (!password_verify($password, $user['password'])) {
        echo json_encode(['status' => 'error', 'pesan' => 'Kata sandi salah.']);
        exit;
    }

    $_SESSION['user_id']   = $user['id'];
    $_SESSION['nama']      = $user['nama_depan'];
    $_SESSION['role']      = $user['role'];

    if ($user['role'] === 'admin') {
        echo json_encode([
            'status' => 'sukses',
            'pesan' => 'Login berhasil.',
            'redirect' => '../Admin/admin.html',
            'user' => ['nama' => $user['nama_depan'], 'role' => $user['role'], 'foto' => $user['foto']]
        ]);
    } else {
        echo json_encode([
            'status' => 'sukses',
            'pesan' => 'Login berhasil.',
            'redirect' => '../Html/lumiere-home.html',
            'user' => ['nama' => $user['nama_depan'], 'role' => $user['role'], 'foto' => $user['foto']]
        ]);
    }
}
