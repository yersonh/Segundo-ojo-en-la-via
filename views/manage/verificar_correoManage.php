<?php
require_once '../config/database.php';
require_once '../models/usuario.php';

header('Content-Type: application/json');

$database = new Database();
$db = $database->conectar();
$usuario = new usuario($db);

if (isset($_POST['correo'])) {
    $correo = $_POST['correo'];
    $existe = $usuario->existeCorreo($correo);

    echo json_encode(['existe' => $existe]);
}
?>