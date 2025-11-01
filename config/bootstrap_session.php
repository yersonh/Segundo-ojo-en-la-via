<?php
if (session_status() === PHP_SESSION_NONE) {
    // Solo iniciar si NO hay sesión activa
    require_once __DIR__ . '/sessions.php';

    SessionManager::start();
    SessionManager::verifySessionData();
    register_shutdown_function([SessionManager::class, 'close']);

    error_log("✅ bootstrap_session.php ejecutado - Sesión iniciada: " . session_id());
} else {
    error_log("⚠️ bootstrap_session.php: Sesión YA activa - ID: " . session_id());
}
?>
