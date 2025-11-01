<?php
require_once __DIR__ . '/../models/persona.php';
require_once __DIR__ . '/../models/usuario.php';

class SesionControlador {
    private $personaModel;
    private $usuarioModel;

    public function __construct($db) {
        $this->personaModel = new Persona($db);
        $this->usuarioModel = new Usuario($db);
    }

    public function registrar($nombres, $apellidos, $correo, $telefono, $id_rol, $id_estado, $password) {
        // Validar si el correo ya existe en la tabla usuario
        if ($this->usuarioModel->existeCorreo($correo)) {
            return false;
        }

        $id_persona = $this->personaModel->insertar($nombres, $apellidos, $telefono);

        if ($id_persona) {
            // Insertar usuario asociado a la persona (incluyendo id_estado)
            return $this->usuarioModel->insertar($id_persona, $id_rol, $id_estado, $correo, $password);

        }

        return false;
    }

    public function login($correo, $password) {
        // Obtener usuario CON DATOS DE PERSONA (JOIN)
        $usuario = $this->usuarioModel->obtenerPorCorreo($correo);

        if ($usuario && password_verify($password, $usuario['contrasena'])) {
            if ($usuario['id_estado'] == 1) { // 1 = Activo
                return $usuario;
            } else {
                return false;
            }
        }

        return false;
    }

    public function obtenerUsuario($id_usuario) {
        return $this->usuarioModel->obtenerPorIdConPersona($id_usuario);
    }

    public function actualizarEstado($id_usuario, $id_estado) {
        return $this->usuarioModel->actualizarEstado($id_usuario, $id_estado);
    }
}
?>
