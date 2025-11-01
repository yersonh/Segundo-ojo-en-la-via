<?php
// bootstrap_session.php - Versión Mejorada
error_log("🔧 bootstrap_session.php cargado - Estado sesión: " . session_status());

if (session_status() === PHP_SESSION_NONE) {
    // Solo iniciar si NO hay sesión activa
    require_once __DIR__ . '/sessions.php';

    try {
        SessionManager::start();
        SessionManager::verifySessionData();

        // Registrar cierre automático al final del script
        register_shutdown_function([SessionManager::class, 'close']);

        error_log("✅ bootstrap_session.php - Sesión iniciada correctamente: " . session_id());

    } catch (Exception $e) {
        error_log("❌ bootstrap_session.php - Error al iniciar sesión: " . $e->getMessage());
        // Puedes agregar un fallback aquí si es necesario
    }

} else {
    error_log("⚠️ bootstrap_session.php - Sesión ya estaba activa: " . session_id());

    // Aún así verificar los datos de sesión
    if (class_exists('SessionManager')) {
        SessionManager::verifySessionData();
    }
}
?>
