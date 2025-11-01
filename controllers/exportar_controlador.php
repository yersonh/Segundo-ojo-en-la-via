<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/admin_controlador.php';

// Verificar que el usuario esté logueado y sea administrador
if (!isset($_SESSION['usuario_id']) || $_SESSION['rol'] != 1) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso no autorizado']);
    exit();
}

class ExportarControlador {
    private $db;
    private $adminControlador;

    public function __construct($database) {
        $this->db = $database->conectar();
        $this->adminControlador = new AdminControlador($database);
    }

    public function exportarUsuarios($datos) {
        try {
            // Obtener usuarios según el filtro
            $usuarios = $this->obtenerUsuariosFiltrados($datos['filtro']);

            // Aplicar selección de campos
            $usuarios = $this->filtrarCampos($usuarios, $datos['campos']);

            // Generar archivo según el formato
            switch ($datos['formato']) {
                case 'csv':
                    return $this->generarCSV($usuarios);
                case 'excel':
                    return $this->generarExcel($usuarios);
                case 'json':
                    return $this->generarJSON($usuarios);
                default:
                    throw new Exception('Formato no soportado');
            }

        } catch (Exception $e) {
            error_log("Error exportando usuarios: " . $e->getMessage());
            throw $e;
        }
    }

    private function obtenerUsuariosFiltrados($filtro) {
        $usuarios = $this->adminControlador->obtenerUsuarios(1000); // Límite alto para exportación

        switch ($filtro) {
            case 'activos':
                return array_filter($usuarios, fn($u) => $u['estado'] === 'Activo');
            case 'inactivos':
                return array_filter($usuarios, fn($u) => $u['estado'] === 'Inactivo');
            case 'admin':
                return array_filter($usuarios, fn($u) => $u['rol'] === 'Admin');
            case 'usuario':
                return array_filter($usuarios, fn($u) => $u['rol'] === 'Usuario');
            default:
                return $usuarios;
        }
    }

    private function filtrarCampos($usuarios, $camposSeleccionados) {
        return array_map(function($usuario) use ($camposSeleccionados) {
            $filtrado = [];

            foreach ($camposSeleccionados as $campo) {
                switch ($campo) {
                    case 'id':
                        $filtrado['ID'] = $usuario['id_usuario'];
                        break;
                    case 'nombre':
                        $filtrado['Nombre'] = $usuario['nombres'] . ' ' . $usuario['apellidos'];
                        break;
                    case 'correo':
                        $filtrado['Correo'] = $usuario['correo'];
                        break;
                    case 'telefono':
                        $filtrado['Teléfono'] = $usuario['telefono'] ?: 'No registrado';
                        break;
                    case 'rol':
                        $filtrado['Rol'] = $usuario['rol'];
                        break;
                    case 'estado':
                        $filtrado['Estado'] = $usuario['estado'];
                        break;
                    case 'reportes':
                        $filtrado['Total Reportes'] = $usuario['total_reportes'];
                        break;
                }
            }

            return $filtrado;
        }, $usuarios);
    }

    private function generarCSV($usuarios) {
        if (empty($usuarios)) {
            throw new Exception('No hay datos para exportar');
        }

        // Obtener headers
        $headers = array_keys($usuarios[0]);

        // Crear contenido CSV
        $output = fopen('php://output', 'w');

        // Agregar BOM para Excel
        fwrite($output, "\xEF\xBB\xBF");

        // Escribir headers
        fputcsv($output, $headers, ';');

        // Escribir datos
        foreach ($usuarios as $usuario) {
            fputcsv($output, $usuario, ';');
        }

        fclose($output);

        return ob_get_clean();
    }

    private function generarExcel($usuarios) {
        // Para Excel simple, generamos CSV con extensión xlsx
        // En una implementación real, usarías una librería como PhpSpreadsheet
        $csvContent = $this->generarCSV($usuarios);

        // Simulamos Excel devolviendo CSV con cabeceras de Excel
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return $csvContent;
    }

    private function generarJSON($usuarios) {
        return json_encode($usuarios, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}

// Procesar la solicitud
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['action']) || $input['action'] !== 'exportar_usuarios') {
            throw new Exception('Acción no válida');
        }

        $database = new Database();
        $exportarControlador = new ExportarControlador($database);

        // Configurar headers según el formato
        $formato = $input['datos']['formato'];
        switch ($formato) {
            case 'csv':
                header('Content-Type: text/csv; charset=utf-8');
                header('Content-Disposition: attachment; filename="usuarios.csv"');
                break;
            case 'excel':
                header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                header('Content-Disposition: attachment; filename="usuarios.xlsx"');
                break;
            case 'json':
                header('Content-Type: application/json');
                header('Content-Disposition: attachment; filename="usuarios.json"');
                break;
        }

        $resultado = $exportarControlador->exportarUsuarios($input['datos']);
        echo $resultado;

    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
