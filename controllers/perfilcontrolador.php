<?php
// controllers/perfilcontrolador.php - SOLO para actualizar perfil
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/sessions.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (!isset($_SESSION['usuario_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'actualizar_perfil') {
    try {
        $database = new Database();
        $pdo = $database->conectar();

        $usuario_id = $_SESSION['usuario_id'];
        $nombres = trim($_POST['nombres'] ?? '');
        $apellidos = trim($_POST['apellidos'] ?? '');
        $telefono = trim($_POST['telefono'] ?? '');

        // Validaciones
        if (empty($nombres)) {
            throw new Exception('El nombre es obligatorio');
        }

        // Obtener id_persona
        $stmt = $pdo->prepare("SELECT id_persona FROM usuario WHERE id_usuario = ?");
        $stmt->execute([$usuario_id]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            throw new Exception('Usuario no encontrado');
        }

        $id_persona = $usuario['id_persona'];

        // Manejar upload de imagen (opcional)
        $foto_perfil = null;
        if (isset($_FILES['foto_perfil']) && $_FILES['foto_perfil']['error'] === UPLOAD_ERR_OK) {
            $foto = $_FILES['foto_perfil'];

            // Validaciones de imagen...
            $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
            if (!in_array($foto['type'], $allowed_types)) {
                throw new Exception('Formato de imagen no permitido');
            }

            if ($foto['size'] > 5 * 1024 * 1024) {
                throw new Exception('La imagen debe ser menor a 5MB');
            }

            $upload_dir = __DIR__ . '/../uploads/perfiles/';
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0755, true);
            }

            $extension = pathinfo($foto['name'], PATHINFO_EXTENSION);
            $filename = 'perfil_' . $usuario_id . '_' . time() . '.' . $extension;
            $filepath = $upload_dir . $filename;

            if (move_uploaded_file($foto['tmp_name'], $filepath)) {
                $foto_perfil = '/uploads/perfiles/' . $filename;
            }
        }

        // Actualizar en la base de datos
        if ($foto_perfil) {
            $stmt = $pdo->prepare("
                UPDATE persona
                SET nombres = ?, apellidos = ?, telefono = ?, foto_perfil = ?
                WHERE id_persona = ?
            ");
            $stmt->execute([$nombres, $apellidos, $telefono, $foto_perfil, $id_persona]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE persona
                SET nombres = ?, apellidos = ?, telefono = ?
                WHERE id_persona = ?
            ");
            $stmt->execute([$nombres, $apellidos, $telefono, $id_persona]);
        }

        // Actualizar sesión
        $_SESSION['nombres'] = $nombres;
        $_SESSION['apellidos'] = $apellidos;
        $_SESSION['telefono'] = $telefono;
        if ($foto_perfil) {
            $_SESSION['foto_perfil'] = $foto_perfil;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Perfil actualizado correctamente',
            'data' => [
                'nombres' => $nombres,
                'apellidos' => $apellidos,
                'telefono' => $telefono,
                'correo' => $_SESSION['correo'],
                'foto_perfil' => $foto_perfil ?: ($_SESSION['foto_perfil'] ?? '')
            ]
        ]);

    } catch (Exception $e) {
        error_log("Error actualizando perfil: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
}
?>
