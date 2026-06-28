<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';

if ($action === 'get') {
    $result = $conn->query("SELECT * FROM produk ORDER BY dibuat DESC");
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $row['ukuran'] = $row['ukuran'] ? explode(',', $row['ukuran']) : [];
        $row['warna']  = $row['warna']  ? explode(',', $row['warna'])  : [];
        $data[] = $row;
    }
    echo json_encode(['status' => 'sukses', 'data' => $data]);
}

elseif ($action === 'detail') {
    $id = (int)$_GET['id'];
    $stmt = $conn->prepare("SELECT * FROM produk WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    if ($row) {
        $row['ukuran'] = $row['ukuran'] ? explode(',', $row['ukuran']) : [];
        $row['warna']  = $row['warna']  ? explode(',', $row['warna'])  : [];
        echo json_encode(['status' => 'sukses', 'data' => $row]);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Produk tidak ditemukan.']);
    }
}
