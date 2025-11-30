<?php
class SessionManager {
    public static function start() {
        error_log("=== INICIANDO SessionManager::start() ===");
        error_log("Estado sesión inicial: " . session_status());
        error_log("APP_ENV: " . (getenv('APP_ENV') ?: 'NOT_SET'));
        error_log("REDIS_URL: " . (getenv('REDIS_URL') ?: 'NOT_SET'));

        if (session_status() === PHP_SESSION_ACTIVE) {
            error_log("🔍 SessionManager: Sesión ya está activa - ID: " . session_id());
            return;
        }

        $redisUrl = getenv('REDIS_URL') ?: 'redis://default:DRNukNuOugIPIHsJZOxwPuyrBySWqjzC@redis.railway.internal:6379';
        self::setupRedisSession($redisUrl);

        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => $_SERVER['HTTP_HOST'] ?? '',
            'secure' => isset($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        session_name('OJOSESSION');

        ini_set('session.use_strict_mode', 1);
        ini_set('session.use_cookies', 1);
        ini_set('session.use_only_cookies', 1);
        ini_set('session.cookie_httponly', 1);
        ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));

        session_start();

        error_log("✅ SessionManager: SESION INICIADA - ID: " . session_id());
        error_log("📊 SessionManager: DATOS SESION: " . print_r($_SESSION, true));

        self::regenerateSessionId();
    }

    private static function setupRedisSession($redisUrl) {
        try {
            // SOLO configurar Redis si la sesión NO está activa
            if (session_status() !== PHP_SESSION_ACTIVE) {
                $redisConfig = parse_url($redisUrl);

                if ($redisConfig && isset($redisConfig['host'])) {
                    $redisPath = sprintf(
                        "tcp://%s:%d?auth=%s&database=0&timeout=5&read_timeout=5&prefix=ojo_session_",
                        $redisConfig['host'],
                        $redisConfig['port'] ?? 6379,
                        $redisConfig['pass'] ?? ''
                    );

                    ini_set('session.save_handler', 'redis');
                    ini_set('session.save_path', $redisPath);
                    ini_set('session.gc_maxlifetime', 3600); // 1 hora

                    error_log("✅ REDIS CONFIGURADO: " . $redisConfig['host']);
                } else {
                    error_log("⚠️ REDIS: URL inválida, usando sesiones por defecto");
                }
            }
        } catch (Exception $e) {
            error_log("❌ ERROR REDIS: " . $e->getMessage());
            // Fallback a sesiones por defecto
            ini_set('session.save_handler', 'files');
        }
    }

    private static function regenerateSessionId() {
        if (session_status() === PHP_SESSION_ACTIVE && !headers_sent()) {
            if (!isset($_SESSION['last_regeneration']) ||
                time() - $_SESSION['last_regeneration'] > 1800) {

                session_regenerate_id(true);
                $_SESSION['last_regeneration'] = time();
                error_log("🔄 ID regenerado: " . session_id());
            }
        }
    }

    public static function close() {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
            error_log("🔒 SessionManager: Sesión cerrada");
        }
    }

    public static function verifySessionData() {
        if (session_status() === PHP_SESSION_ACTIVE) {
            error_log("🔍 SessionManager: VERIFICANDO DATOS SESION:");
            error_log("  - usuario_id: " . ($_SESSION['usuario_id'] ?? 'NO'));
            error_log("  - rol: " . ($_SESSION['rol'] ?? 'NO'));
            error_log("  - nombres: " . ($_SESSION['nombres'] ?? 'NO'));
            error_log("  - session_id: " . session_id());

            // Inicializar datos si no existen
            if (!isset($_SESSION['usuario_id'])) $_SESSION['usuario_id'] = null;
            if (!isset($_SESSION['rol'])) $_SESSION['rol'] = null;
            if (!isset($_SESSION['nombres'])) $_SESSION['nombres'] = null;
            if (!isset($_SESSION['apellidos'])) $_SESSION['apellidos'] = null;
            if (!isset($_SESSION['telefono'])) $_SESSION['telefono'] = null;
            if (!isset($_SESSION['correo'])) $_SESSION['correo'] = null;
        }
    }

    public static function destroy() {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
            error_log("🗑️ SessionManager: Sesión destruida");
        }
    }
}
?>
