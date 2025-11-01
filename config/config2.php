<?php
// En config.php o en un archivo helper
class ImageHelper {
    public static function getProfileImageUrl($foto_perfil, $base_url) {
        // Si la foto es null o vacía, usar la imagen por defecto
        if (empty($foto_perfil)) {
            return $base_url . '/imagenes/usuarios/imagendefault.png';
        }

        // Si ya es una URL completa, devolverla tal cual
        if (strpos($foto_perfil, 'http') === 0) {
            return $foto_perfil;
        }

        // Si es una ruta relativa, convertirla a URL absoluta
        return $base_url . $foto_perfil;
    }

    public static function getDefaultProfileImage() {
        return '/imagenes/usuarios/imagendefault.png';
    }
}
?>
