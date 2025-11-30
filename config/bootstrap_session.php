<?php
error_log("🔧 bootstrap_session.php cargado - Estado sesión: " . session_status());

if (session_status() === PHP_SESSION_NONE) {
    require_once __DIR__ . '/sessions.php';

    try {
        SessionManager::start();
        SessionManager::verifySessionData();

        register_shutdown_function([SessionManager::class, 'close']);

        error_log("✅ bootstrap_session.php - Sesión iniciada correctamente: " . session_id());

    } catch (Exception $e) {
        error_log("❌ bootstrap_session.php - Error al iniciar sesión: " . $e->getMessage());
    }

} else {
    error_log("⚠️ bootstrap_session.php - Sesión ya estaba activa: " . session_id());

    if (class_exists('SessionManager')) {
        SessionManager::verifySessionData();
    }
}
?>
