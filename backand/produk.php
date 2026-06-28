<?php
header('Content-Type: application/json');
$action = $_POST['action'] ?? $_GET['action'] ?? '';

require_once 'config.php';

//  AMBIL SEMUA PRODUK 
if ($action === 'get') {
    $result = $conn->query("SELECT * FROM produk ORDER BY dibuat DESC");
    
    if (!$result) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'pesan' => 'Query gagal: ' . $conn->error]);
        exit;
    }
    
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $row['ukuran'] = $row['ukuran'] ? explode(',', $row['ukuran']) : [];
        $row['warna']  = $row['warna']  ? explode(',', $row['warna'])  : [];
        $data[] = $row;
    }
    echo json_encode(['status' => 'sukses', 'data' => $data]);
}

//  TAMBAH PRODUK 
elseif ($action === 'tambah') {
    $nama      = trim($_POST['nama']);
    $kategori  = trim($_POST['kategori']);
    $harga     = (int)$_POST['harga'];
    $stok      = (int)$_POST['stok'];
    $material  = trim($_POST['material'] ?? '');
    $kondisi   = trim($_POST['kondisi'] ?? '');
    $berat     = trim($_POST['berat'] ?? '');
    $perawatan = trim($_POST['perawatan'] ?? '');
    $deskripsi = trim($_POST['deskripsi'] ?? '');
    $ukuran    = trim($_POST['ukuran'] ?? '');
    $warna     = trim($_POST['warna'] ?? '');
    $gambar    = '';

    // Upload gambar
    if (!empty($_FILES['gambar']['name'])) {
        $ext      = pathinfo($_FILES['gambar']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('prod_') . '.' . $ext;
        $target   = '../uploads/produk/' . $filename;
        if (move_uploaded_file($_FILES['gambar']['tmp_name'], $target)) {
            $gambar = $filename;
        }
    }

    $stmt = $conn->prepare("INSERT INTO produk (nama, kategori, harga, stok, material, kondisi, berat, perawatan, deskripsi, ukuran, warna, gambar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssiissssssss", $nama, $kategori, $harga, $stok, $material, $kondisi, $berat, $perawatan, $deskripsi, $ukuran, $warna, $gambar);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Produk berhasil ditambahkan.', 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menambahkan produk.']);
    }
}

//  EDIT PRODUK 
elseif ($action === 'edit') {
    $id        = (int)$_POST['id'];
    $nama      = trim($_POST['nama']);
    $kategori  = trim($_POST['kategori']);
    $harga     = (int)$_POST['harga'];
    $stok      = (int)$_POST['stok'];
    $material  = trim($_POST['material'] ?? '');
    $kondisi   = trim($_POST['kondisi'] ?? '');
    $berat     = trim($_POST['berat'] ?? '');
    $perawatan = trim($_POST['perawatan'] ?? '');
    $deskripsi = trim($_POST['deskripsi'] ?? '');
    $ukuran    = trim($_POST['ukuran'] ?? '');
    $warna     = trim($_POST['warna'] ?? '');

    // Cek ada gambar baru 
    $gambarQuery = '';
    $gambar = '';
    if (!empty($_FILES['gambar']['name'])) {
        $ext      = pathinfo($_FILES['gambar']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('prod_') . '.' . $ext;
        $target   = '../uploads/produk/' . $filename;
        if (move_uploaded_file($_FILES['gambar']['tmp_name'], $target)) {
            $gambar = $filename;
            $gambarQuery = ', gambar = ?';
        }
    }

    if ($gambar) {
        $stmt = $conn->prepare("UPDATE produk SET nama=?, kategori=?, harga=?, stok=?, material=?, kondisi=?, berat=?, perawatan=?, deskripsi=?, ukuran=?, warna=?, gambar=? WHERE id=?");
        $stmt->bind_param("ssiissssssssi", $nama, $kategori, $harga, $stok, $material, $kondisi, $berat, $perawatan, $deskripsi, $ukuran, $warna, $gambar, $id);
    } else {
        $stmt = $conn->prepare("UPDATE produk SET nama=?, kategori=?, harga=?, stok=?, material=?, kondisi=?, berat=?, perawatan=?, deskripsi=?, ukuran=?, warna=? WHERE id=?");
        $stmt->bind_param("ssiisssssssi", $nama, $kategori, $harga, $stok, $material, $kondisi, $berat, $perawatan, $deskripsi, $ukuran, $warna, $id);
    }

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Produk berhasil diperbarui.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal memperbarui produk.']);
    }
}

//  HAPUS PRODUK 
elseif ($action === 'hapus') {
    $id = (int)$_POST['id'];

    // Ambil nama gambar dulu buat dihapus dari folder
    $res = $conn->query("SELECT gambar FROM produk WHERE id = $id");
    $row = $res->fetch_assoc();
    if ($row['gambar']) {
        $file = '../uploads/produk/' . $row['gambar'];
        if (file_exists($file)) unlink($file);
    }

    $stmt = $conn->prepare("DELETE FROM produk WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sukses', 'pesan' => 'Produk berhasil dihapus.']);
    } else {
        echo json_encode(['status' => 'error', 'pesan' => 'Gagal menghapus produk.']);
    }
}
