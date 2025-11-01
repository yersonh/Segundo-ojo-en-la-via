<?php
class Persona {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function insertar($nombres, $apellidos, $telefono, $foto_perfil = null) {
        if ($foto_perfil === null) {
            $foto_perfil = '/imagenes/usuarios/imagendefault.png';
        }
        $sql = "INSERT INTO persona (nombres, apellidos, telefono, foto_perfil)
                VALUES (:nombres, :apellidos, :telefono, :foto_perfil)
                RETURNING id_persona";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':nombres', $nombres);
        $stmt->bindParam(':apellidos', $apellidos);
        $stmt->bindParam(':telefono', $telefono);
        $stmt->bindParam(':foto_perfil', $foto_perfil);

        try {
            $stmt->execute();
            $row = $stmt->fetch();
            return $row['id_persona'];
        } catch (PDOException $e) {
            echo "❌ Error al insertar persona: " . $e->getMessage();
            return false;
        }
    }
    public function actualizarFoto($id_persona, $foto_perfil) {
        $sql = "UPDATE persona SET foto_perfil = :foto_perfil WHERE id_persona = :id_persona";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':foto_perfil', $foto_perfil);
        $stmt->bindParam(':id_persona', $id_persona);

        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("❌ Error al actualizar foto: " . $e->getMessage());
            return false;
        }
    }

}
