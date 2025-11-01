<?php
// api/health-check.php - Versión simplificada
header('Content-Type: application/json');

// CORS simplificado - Permitir todos los orígenes para health checks
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar estado de la aplicación
try {
    // 1. Verificar si la base de datos está accesible (opcional)
    $db_healthy = true;
    if (file_exists('../config/database.php')) {
        require_once '../config/database.php';
        // Intentar conexión simple a la base de datos
        // $db_healthy = verificarConexionDB(); // Implementa esta función si quieres
    }

    // 2. Verificar sistema de archivos
    $storage_healthy = is_writable('../uploads') && is_writable('../tmp');

    // 3. Estado general
    $health_status = [
        'status' => 'healthy',
        'timestamp' => time(),
        'service' => 'Ojo en la Vía',
        'version' => '1.0.0',
        'environment' => $_ENV['RAILWAY_ENVIRONMENT'] ?? 'development',
        'checks' => [
            'database' => $db_healthy,
            'storage' => $storage_healthy,
            'api' => true
        ]
    ];

    $http_code = 200;

} catch (Exception $e) {
    $health_status = [
        'status' => 'unhealthy',
        'timestamp' => time(),
        'error' => $e->getMessage(),
        'service' => 'Ojo en la Vía'
    ];
    $http_code = 503;
}

// Para solicitudes HEAD, solo enviar headers
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    http_response_code($http_code);
    exit;
}

// Para solicitudes GET, enviar JSON completo
http_response_code($http_code);
echo json_encode($health_status, JSON_PRETTY_PRINT);
?>
