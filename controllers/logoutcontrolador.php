<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once '../config/sessions.php';

if (isset($_SESSION['usuario_id'])) {
    $usuario_id = $_SESSION['usuario_id'];
    $fecha_logout = date('Y-m-d H:i:s');
}
$_SESSION = array();
if (isset($_COOKIE['remember_token'])) {
    setcookie('remember_token', '', time() - 3600, '/');
}
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


if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}


header("Location: ../index.php?logout=1");
exit();

function auditLog($usuario_id, $accion, $fecha) {

}
?>
