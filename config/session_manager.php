<?php
class SessionManager {
    public static function generateSSEToken($id_usuario) {
        require_once __DIR__ . '/database.php';
        $database = new Database();
        $db = $database->conectar();

        // Generar token único
        $token = bin2hex(random_bytes(32));
        $expiracion = date('Y-m-d H:i:s', time() + 3600); // 1 hora

        // Usar tu tabla existente remember_tokens
        $stmt = $db->prepare("
            INSERT INTO remember_tokens (id_usuario, token, expiracion)
            VALUES (:id_usuario, :token, :expiracion)
        ");

        $stmt->execute([
            ':id_usuario' => $id_usuario,
            ':token' => $token,
            ':expiracion' => $expiracion
        ]);

        return $token;
    }

    public static function validateSSEToken($token) {
        require_once __DIR__ . '/database.php';
        $database = new Database();
        $db = $database->conectar();

        $stmt = $db->prepare("
            SELECT u.id_usuario, u.id_rol
            FROM usuario u
            INNER JOIN remember_tokens rt ON u.id_usuario = rt.id_usuario
            WHERE rt.token = :token
            AND rt.expiracion > NOW()
            AND u.id_estado = 1
        ");

        $stmt->execute([':token' => $token]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public static function cleanupExpiredTokens() {
        require_once __DIR__ . '/database.php';
        $database = new Database();
        $db = $database->conectar();

        $stmt = $db->prepare("DELETE FROM remember_tokens WHERE expiracion <= NOW()");
        $stmt->execute();
    }

    public static function invalidateToken($token) {
        require_once __DIR__ . '/database.php';
        $database = new Database();
        $db = $database->conectar();

        $stmt = $db->prepare("DELETE FROM remember_tokens WHERE token = :token");
        $stmt->execute([':token' => $token]);
    }
}
?>
