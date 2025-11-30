<?php
require_once __DIR__ . '/config/bootstrap_session.php';

if (isset($_COOKIE['remember_token'])) {
    require_once 'config/database.php';
    $database = new Database();
    $db = $database->conectar();

    $stmt = $db->prepare("DELETE FROM remember_tokens WHERE token = :token");
    $stmt->bindParam(':token', $_COOKIE['remember_token']);
    $stmt->execute();

    setcookie('remember_token', '', time() - 3600, '/');
}

session_destroy();

header("Location: ../index.php");
exit();
?>
