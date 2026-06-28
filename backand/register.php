<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama_depan    = trim($_POST['nama_depan']);
    $nama_belakang = trim($_POST['nama_belakang']);
    $email         = trim($_POST['email']);
    $no_telp       = trim($_POST['no_telp']);
    $password      = $_POST['password'];
    $promo_email   = isset($_POST['promo_email']) ? 1 : 0;

    // Cek email terdaftar atau belum
    $cek = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $cek->bind_param("s", $email);
    $cek->execute();
    $cek->store_result();

    if ($cek->num_rows > 0) {
        echo json_encode(['status' => 'error', 'pesan' => 'Email sudah terdaftar.']);
        exit;
    }

    // Hash password
    $hash = password_hash($password, PASSWORD_BCRYPT);

    // Insert ke database
    $stmt = $conn->prepare("INSERT INTO users (nama_depan, nama_belakang, email, no_telp, password, promo_email) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssi", $nama_depan, $nama_belakang, $email, $no_telp, $hash, $promo_email);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Akun berhasil dibuat.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal membuat akun.']);
    }
}
?>