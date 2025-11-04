<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->conectar();

    // 🆕 VERIFICAR SESIÓN UNA SOLA VEZ para los casos que lo necesitan
    $id_usuario = $_SESSION['usuario_id'] ?? null;
    $rol_usuario = $_SESSION['rol'] ?? null;

    switch ($action) {
        // 🆕 NOTIFICAR A TODOS LOS ADMINS SOBRE NUEVO REPORTE
        case 'notificar_nuevo_reporte':
            $id_reporte = $_POST['id_reporte'] ?? '';

            if (!$id_reporte) {
                echo json_encode(['success' => false, 'error' => 'ID de reporte requerido']);
                exit();
            }

            if (!is_numeric($id_reporte)) {
                echo json_encode(['success' => false, 'error' => 'ID de reporte inválido']);
                exit();
            }

            // Obtener información del reporte
            $sqlReporte = "SELECT r.descripcion,
                    ti.nombre AS tipo_incidente,
                    r.id_usuario,
                    CONCAT(p.nombres, ' ', p.apellidos) AS nombre_usuario
                FROM reporte r
                INNER JOIN tipo_incidente ti ON r.id_tipo_incidente = ti.id_tipo_incidente
                INNER JOIN usuario u ON r.id_usuario = u.id_usuario
                INNER JOIN persona p ON u.id_persona = p.id_persona
                WHERE r.id_reporte = :id_reporte";
            $stmtReporte = $db->prepare($sqlReporte);
            $stmtReporte->execute([':id_reporte' => $id_reporte]);
            $reporte = $stmtReporte->fetch(PDO::FETCH_ASSOC);

            if (!$reporte) {
                echo json_encode(['success' => false, 'error' => 'Reporte no encontrado']);
                exit();
            }

            // Obtener todos los administradores activos
            $sqlAdmins = "SELECT id_usuario FROM usuario WHERE id_rol = 1 AND id_estado = 1";
            $stmtAdmins = $db->prepare($sqlAdmins);
            $stmtAdmins->execute();
            $admins = $stmtAdmins->fetchAll(PDO::FETCH_ASSOC);

            if (empty($admins)) {
                echo json_encode(['success' => true, 'mensaje' => 'No hay administradores activos para notificar', 'total_notificaciones' => 0]);
                exit();
            }

            $notificaciones_creadas = 0;
            $errors = [];

            foreach ($admins as $admin) {
                $mensaje = "🚨 Nuevo reporte #{$id_reporte}: {$reporte['tipo_incidente']} - " .
                        substr($reporte['descripcion'], 0, 100) . "...";

                // ✅ Ajuste a la estructura real de la tabla (sin fecha_creacion)
                $sqlInsert = "INSERT INTO notificacion
                            (id_usuario_destino, id_usuario_origen, id_reporte, tipo, mensaje)
                            VALUES (:id_destino, :id_origen, :id_reporte, 'nuevo_reporte', :mensaje)";

                try {
                    $stmtInsert = $db->prepare($sqlInsert);
                    $stmtInsert->execute([
                        ':id_destino' => $admin['id_usuario'],
                        ':id_origen' => $reporte['id_usuario'],
                        ':id_reporte' => $id_reporte,
                        ':mensaje' => $mensaje
                    ]);

                    $notificaciones_creadas++;

                } catch (Exception $e) {
                    $errors[] = "Error notificando admin {$admin['id_usuario']}: " . $e->getMessage();
                }
            }

            // Crear archivo para SSE
            try {
                $sseData = [
                    'event' => 'nuevo_reporte',
                    'id_reporte' => $id_reporte,
                    'tipo_incidente' => $reporte['tipo_incidente'],
                    'descripcion' => $reporte['descripcion'],
                    'usuario' => $reporte['nombre_usuario'],
                    'timestamp' => time()
                ];

                $archivoSSE = __DIR__ . '/../temp/ultima_notificacion.json';
                file_put_contents($archivoSSE, json_encode($sseData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

                error_log("📢 Archivo SSE creado: " . $archivoSSE);
            } catch (Exception $e) {
                error_log("❌ Error generando archivo SSE: " . $e->getMessage());
            }

            $response = [
                'success' => true,
                'mensaje' => "{$notificaciones_creadas} notificaciones creadas para administradores",
                'total_notificaciones' => $notificaciones_creadas
            ];

            if (!empty($errors)) {
                $response['warnings'] = $errors;
            }

            echo json_encode($response);
            break;

        // 🔔 Obtener nuevas notificaciones
        case 'obtener_nuevas':
            if (!$id_usuario) {
                echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
                break;
            }

            $ultima_verificacion = $_GET['ultima_verificacion'] ?? null;

            $sql = "SELECT n.*,
                        p.nombres as nombre_origen,
                        p.apellidos as apellido_origen,
                        r.descripcion
                    FROM notificacion n
                    LEFT JOIN usuario u ON n.id_usuario_origen = u.id_usuario
                    LEFT JOIN persona p ON u.id_persona = p.id_persona
                    LEFT JOIN reporte r ON n.id_reporte = r.id_reporte
                    WHERE n.id_usuario_destino = :id_usuario
                    AND n.leida = FALSE";

            $params = [':id_usuario' => $id_usuario];

            if ($ultima_verificacion) {
                $sql .= " AND n.fecha > :ultima_verificacion";
                $params[':ultima_verificacion'] = $ultima_verificacion;
            }

            $sql .= " ORDER BY n.fecha DESC LIMIT 10";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $notificaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($notificaciones as &$notif) {
                if ($notif['nombre_origen']) {
                    $notif['nombre_origen'] = trim($notif['nombre_origen'] . ' ' . $notif['apellido_origen']);
                }
                unset($notif['apellido_origen']);
            }
            unset($notif);

            $sqlCount = "SELECT COUNT(*) as total FROM notificacion
                        WHERE id_usuario_destino = :id_usuario AND leida = FALSE";
            $stmtCount = $db->prepare($sqlCount);
            $stmtCount->execute([':id_usuario' => $id_usuario]);
            $total = $stmtCount->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'notificaciones' => $notificaciones,
                'total_nuevas' => $total['total']
            ]);
            break;

        // ✅ Marcar una notificación como leída
        case 'marcar_leida':

            $id_notificacion = $_POST['id_notificacion'] ?? null;

            if (!$id_notificacion) {
                echo json_encode(['success' => false, 'error' => 'ID de notificación requerido']);
                break;
            }

            $sql = "UPDATE notificacion SET leida = TRUE
                    WHERE id_notificacion = :id_notificacion";
            $stmt = $db->prepare($sql);
            $stmt->execute([':id_notificacion' => $id_notificacion]);

            echo json_encode(['success' => true, 'mensaje' => 'Notificación marcada como leída']);
            break;

        // ✅ Marcar todas como leídas
        case 'marcar_todas_leidas':

            if (!$id_usuario) {
                echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
                break;
            }

            $sql = "UPDATE notificacion SET leida = TRUE
                    WHERE id_usuario_destino = :id_usuario AND leida = FALSE";
            $stmt = $db->prepare($sql);
            $stmt->execute([':id_usuario' => $id_usuario]);

            echo json_encode(['success' => true, 'mensaje' => 'Todas las notificaciones marcadas como leídas']);
            break;

        // ✅ Crear notificación manual vía SSE
        case 'crear_notificacion_sse':
            $id_reporte = $_POST['id_reporte'] ?? '';
            $mensaje = $_POST['mensaje'] ?? '';

            if (!$id_reporte || !$mensaje) {
                echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
                break;
            }

            $sqlAdmins = "SELECT id_usuario FROM usuario WHERE id_rol = 1 AND id_estado = 1";
            $stmtAdmins = $db->prepare($sqlAdmins);
            $stmtAdmins->execute();
            $admins = $stmtAdmins->fetchAll(PDO::FETCH_ASSOC);

            $notificaciones_creadas = 0;

            foreach ($admins as $admin) {
                $sqlInsert = "INSERT INTO notificacion
                            (id_usuario_destino, id_usuario_origen, id_reporte, tipo, mensaje)
                            VALUES (:id_destino, :id_origen, :id_reporte, 'nuevo_reporte', :mensaje)";

                $stmtInsert = $db->prepare($sqlInsert);
                $stmtInsert->execute([
                    ':id_destino' => $admin['id_usuario'],
                    ':id_origen' => 0, // Sistema
                    ':id_reporte' => $id_reporte,
                    ':mensaje' => $mensaje
                ]);

                $notificaciones_creadas++;
            }

            echo json_encode([
                'success' => true,
                'mensaje' => "{$notificaciones_creadas} notificaciones creadas"
            ]);
            break;

        // ✅ Generar token SSE
        case 'generate_sse_token':
            if (!$id_usuario || $rol_usuario != 1) {
                echo json_encode(['success' => false, 'error' => 'No autorizado']);
                break;
            }

            // Este archivo probablemente no existe, mejor eliminarlo
            // require_once __DIR__ . '/../config/session_manager.php';

            // Generar token simple
            $token = bin2hex(random_bytes(32));
            $_SESSION['sse_token'] = $token;
            $_SESSION['sse_token_expires'] = time() + 3600;

            echo json_encode([
                'success' => true,
                'token' => $token,
                'expires_in' => 3600
            ]);
            break;

        // 🆕 LISTAR NOTIFICACIONES PARA USUARIO COMÚN
        case 'listar':
            if (!$id_usuario) {
                echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
                break;
            }

            $query = "
                SELECT
                    n.id_notificacion,
                    n.tipo,
                    n.mensaje,
                    n.leida,
                    n.fecha,
                    n.id_reporte,
                    po.nombres as origen_nombres,
                    po.apellidos as origen_apellidos,
                    r.descripcion as reporte_descripcion
                FROM notificacion n
                LEFT JOIN usuario uo ON n.id_usuario_origen = uo.id_usuario
                LEFT JOIN persona po ON uo.id_persona = po.id_persona
                LEFT JOIN reporte r ON n.id_reporte = r.id_reporte
                WHERE n.id_usuario_destino = :id_usuario
                ORDER BY n.fecha DESC
                LIMIT 50
            ";

            $stmt = $db->prepare($query);
            $stmt->execute([':id_usuario' => $id_usuario]);
            $notificaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode($notificaciones);
            break;

        // 🆕 CONTAR NOTIFICACIONES NO LEÍDAS
        case 'contar_no_leidas':
          try {
        // Verificar sesión
        if (!isset($_SESSION['usuario_id'])) {
            echo json_encode(['total_no_leidas' => 0]);
            exit;
        }

        $id_usuario = $_SESSION['usuario_id'];

        $sql = "SELECT COUNT(*) as total_no_leidas
                FROM notificacion
                WHERE id_usuario_destino = ? AND leida = 0";
        $stmt = $db->prepare($sql);
        $stmt->execute([$id_usuario]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'total_no_leidas' => (int)$result['total_no_leidas']
        ]);

    } catch (PDOException $e) {
        error_log("Error contando notificaciones no leídas: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'total_no_leidas' => 0,
            'error' => 'Error del servidor'
        ]);
    }
            break;

case 'notificar_like':
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $id_reporte = $_POST['id_reporte'] ?? null;
        $id_usuario_origen = $_POST['id_usuario_origen'] ?? null; // Quien dio like
        $id_usuario_destino = $_POST['id_usuario_destino'] ?? null; // Dueño del reporte

        if ($id_reporte && $id_usuario_origen && $id_usuario_destino) {
            try {
                // Obtener información del reporte
                $sqlReporte = "SELECT descripcion FROM reporte WHERE id_reporte = ?";
                $stmtReporte = $db->prepare($sqlReporte);
                $stmtReporte->execute([$id_reporte]);
                $reporte = $stmtReporte->fetch(PDO::FETCH_ASSOC);

                // Obtener nombre del usuario que dio like
                $sqlUsuario = "SELECT p.nombres, p.apellidos
                              FROM usuario u
                              INNER JOIN persona p ON u.id_persona = p.id_persona
                              WHERE u.id_usuario = ?";
                $stmtUsuario = $db->prepare($sqlUsuario);
                $stmtUsuario->execute([$id_usuario_origen]);
                $usuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);

                $nombre_usuario = $usuario ? trim($usuario['nombres'] . ' ' . $usuario['apellidos']) : 'Alguien';
                $descripcion_corta = $reporte ? substr($reporte['descripcion'], 0, 50) . '...' : 'tu reporte';

                $mensaje = "👍 {$nombre_usuario} le dio like a tu reporte: \"{$descripcion_corta}\"";

                $sqlInsert = "INSERT INTO notificacion
                            (id_usuario_destino, id_usuario_origen, id_reporte, tipo, mensaje)
                            VALUES (?, ?, ?, 'like', ?)";
                $stmtInsert = $db->prepare($sqlInsert);
                $stmtInsert->execute([$id_usuario_destino, $id_usuario_origen, $id_reporte, $mensaje]);

                echo json_encode(['success' => true, 'mensaje' => 'Notificación de like creada']);

            } catch (Exception $e) {
                error_log("Error notificando like: " . $e->getMessage());
                echo json_encode(['success' => false, 'error' => 'Error creando notificación']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
        }
    }
    break;

    case 'notificar_comentario':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id_reporte = $_POST['id_reporte'] ?? null;
            $id_usuario_origen = $_POST['id_usuario_origen'] ?? null; // Quien comentó
            $id_usuario_destino = $_POST['id_usuario_destino'] ?? null; // Dueño del reporte

            if ($id_reporte && $id_usuario_origen && $id_usuario_destino) {
                try {
                    // Obtener información del reporte
                    $sqlReporte = "SELECT descripcion FROM reporte WHERE id_reporte = ?";
                    $stmtReporte = $db->prepare($sqlReporte);
                    $stmtReporte->execute([$id_reporte]);
                    $reporte = $stmtReporte->fetch(PDO::FETCH_ASSOC);

                    // Obtener nombre del usuario que comentó
                    $sqlUsuario = "SELECT p.nombres, p.apellidos
                                FROM usuario u
                                INNER JOIN persona p ON u.id_persona = p.id_persona
                                WHERE u.id_usuario = ?";
                    $stmtUsuario = $db->prepare($sqlUsuario);
                    $stmtUsuario->execute([$id_usuario_origen]);
                    $usuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);

                    $nombre_usuario = $usuario ? trim($usuario['nombres'] . ' ' . $usuario['apellidos']) : 'Alguien';
                    $descripcion_corta = $reporte ? substr($reporte['descripcion'], 0, 50) . '...' : 'tu reporte';

                    $mensaje = "💬 {$nombre_usuario} comentó en tu reporte: \"{$descripcion_corta}\"";

                    $sqlInsert = "INSERT INTO notificacion
                                (id_usuario_destino, id_usuario_origen, id_reporte, tipo, mensaje)
                                VALUES (?, ?, ?, 'comentario', ?)";
                    $stmtInsert = $db->prepare($sqlInsert);
                    $stmtInsert->execute([$id_usuario_destino, $id_usuario_origen, $id_reporte, $mensaje]);

                    echo json_encode(['success' => true, 'mensaje' => 'Notificación de comentario creada']);

                } catch (Exception $e) {
                    error_log("Error notificando comentario: " . $e->getMessage());
                    echo json_encode(['success' => false, 'error' => 'Error creando notificación']);
                }
            } else {
                echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
            }
        }
        break;

    case 'notificar_nuevo_reporte_usuario':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id_reporte = $_POST['id_reporte'] ?? null;
            $id_usuario_origen = $_POST['id_usuario_origen'] ?? null; // Quien creó el reporte

            if ($id_reporte && $id_usuario_origen) {
                try {
                    // Obtener información del reporte
                    $sqlReporte = "SELECT r.descripcion, ti.nombre as tipo_incidente
                                FROM reporte r
                                INNER JOIN tipo_incidente ti ON r.id_tipo_incidente = ti.id_tipo_incidente
                                WHERE r.id_reporte = ?";
                    $stmtReporte = $db->prepare($sqlReporte);
                    $stmtReporte->execute([$id_reporte]);
                    $reporte = $stmtReporte->fetch(PDO::FETCH_ASSOC);

                    // Obtener nombre del usuario que creó el reporte
                    $sqlUsuario = "SELECT p.nombres, p.apellidos
                                FROM usuario u
                                INNER JOIN persona p ON u.id_persona = p.id_persona
                                WHERE u.id_usuario = ?";
                    $stmtUsuario = $db->prepare($sqlUsuario);
                    $stmtUsuario->execute([$id_usuario_origen]);
                    $usuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);

                    $nombre_usuario = $usuario ? trim($usuario['nombres'] . ' ' . $usuario['apellidos']) : 'Un usuario';
                    $tipo_incidente = $reporte['tipo_incidente'] ?? 'incidente';
                    $descripcion_corta = $reporte ? substr($reporte['descripcion'], 0, 50) . '...' : 'nuevo reporte';

                    $mensaje = "📢 {$nombre_usuario} reportó un {$tipo_incidente}: \"{$descripcion_corta}\"";

                    // Notificar a todos los usuarios activos (excepto al que creó el reporte)
                    $sqlUsuarios = "SELECT id_usuario FROM usuario WHERE id_estado = 1 AND id_usuario != ?";
                    $stmtUsuarios = $db->prepare($sqlUsuarios);
                    $stmtUsuarios->execute([$id_usuario_origen]);
                    $usuarios = $stmtUsuarios->fetchAll(PDO::FETCH_ASSOC);

                    $notificaciones_creadas = 0;

                    foreach ($usuarios as $usuario_destino) {
                        $sqlInsert = "INSERT INTO notificacion
                                    (id_usuario_destino, id_usuario_origen, id_reporte, tipo, mensaje)
                                    VALUES (?, ?, ?, 'nuevo_reporte_usuario', ?)";
                        $stmtInsert = $db->prepare($sqlInsert);
                        $stmtInsert->execute([
                            $usuario_destino['id_usuario'],
                            $id_usuario_origen,
                            $id_reporte,
                            $mensaje
                        ]);
                        $notificaciones_creadas++;
                    }

                    echo json_encode([
                        'success' => true,
                        'mensaje' => "{$notificaciones_creadas} notificaciones creadas para usuarios"
                    ]);

                } catch (Exception $e) {
                    error_log("Error notificando nuevo reporte: " . $e->getMessage());
                    echo json_encode(['success' => false, 'error' => 'Error creando notificaciones']);
                }
            } else {
                echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
            }
        }
        break;
        default:
            echo json_encode(['success' => false, 'error' => 'Acción no válida']);
    }

} catch (Exception $e) {
    $mensajeError = $e->getMessage();
    if (stripos($mensajeError, 'SQLSTATE') !== false || stripos($mensajeError, 'failed') !== false) {
        http_response_code(500);
    }
    echo json_encode(['success' => false, 'error' => $mensajeError]);
}
?>
