<?php
require_once __DIR__ . '/config/bootstrap_session.php';

// Eliminar token de "Recuérdame" si existe
if (isset($_COOKIE['remember_token'])) {
    require_once 'config/database.php';
    $database = new Database();
    $db = $database->conectar();
    
    $stmt = $db->prepare("DELETE FROM remember_tokens WHERE token = :token");
    $stmt->bindParam(':token', $_COOKIE['remember_token']);
    $stmt->execute();
    
    // Eliminar cookie
    setcookie('remember_token', '', time() - 3600, '/');
}

// Destruir sesión
session_destroy();

// Redirigir al login
header("Location: ../index.php");
exit();
?>