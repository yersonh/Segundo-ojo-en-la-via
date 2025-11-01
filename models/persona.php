<?php
class Persona {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function insertar($nombres, $apellidos, $telefono) {
        $sql = "INSERT INTO persona (nombres, apellidos, telefono)
                VALUES (:nombres, :apellidos, :telefono)
                RETURNING id_persona";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':nombres', $nombres);
        $stmt->bindParam(':apellidos', $apellidos);
        $stmt->bindParam(':telefono', $telefono);

        try {
            $stmt->execute();
            $row = $stmt->fetch();
            return $row['id_persona'];
        } catch (PDOException $e) {
            echo "❌ Error al insertar persona: " . $e->getMessage();
            return false;
        }
    }

}
