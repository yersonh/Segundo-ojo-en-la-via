<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// controllers/logoutcontrolador.php - Versión Mejorada
require_once '../config/sessions.php';

// Registrar el logout para auditoría
if (isset($_SESSION['usuario_id'])) {
    $usuario_id = $_SESSION['usuario_id'];
    $fecha_logout = date('Y-m-d H:i:s');
}
// Destruir todas las variables de sesión
$_SESSION = array();
// Limpiar tokens de remember me si existen
if (isset($_COOKIE['remember_token'])) {
    setcookie('remember_token', '', time() - 3600, '/');
}
// Destruir cookie de sesión
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

// Destruir sesión
if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}

// Redirigir al login con mensaje
header("Location: ../index.php?logout=1");
exit();

// Función para logs de auditoría (opcional)
function auditLog($usuario_id, $accion, $fecha) {
    // Implementar según tu estructura de base de datos
    // Ejemplo: INSERT INTO audit_log (usuario_id, accion, fecha) VALUES (...)
}
?>
