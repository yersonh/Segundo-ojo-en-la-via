import { Config, TipoIconos } from './utils/Config.js';

export class PopupManager {
    constructor() {
        this.galleryManager = null;
    }

    setGalleryManager(galleryManager) {
        this.galleryManager = galleryManager;
    }

    crearPopupContent(reporte) {
        const fecha = new Date(reporte.fecha_reporte);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const colorEstado = Config.icons.estado[reporte.estado] || Config.icons.defaultColor;

        let imagenesHTML = '';
        if (reporte.imagenes && reporte.imagenes.length > 0) {
            imagenesHTML = this._crearHTMLImagenes(reporte);
        }

        return `
            <div style="min-width: 320px; max-width: 400px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <!-- Encabezado con gradiente -->
                <div style="
                    background: linear-gradient(135deg, ${colorEstado}, ${this._ajustarBrillo(colorEstado, -30)});
                    color: white;
                    padding: 15px;
                    margin: -16px -16px 15px -16px;
                    border-radius: 8px 8px 0 0;
                ">
                    <h4 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">${TipoIconos[reporte.tipo_incidente] || TipoIconos.default}</span>
                        ${reporte.tipo_incidente}
                    </h4>
                </div>

                <!-- Contenido -->
                <div style="padding: 0 10px;">
                    ${imagenesHTML}

                    <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.5; color: #555;">
                        ${reporte.descripcion}
                    </p>

                    <!-- Información detallada -->
                    <div style="font-size: 13px; color: #666; line-height: 1.6;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                            <span style="color: #3498db; font-size: 14px;">👤</span>
                            <div>
                                <strong style="color: #333;">Reportado por:</strong><br>
                                <span style="color: #2c3e50;">${reporte.usuario}</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                            <span style="color: #e74c3c; font-size: 14px;">📅</span>
                            <div>
                                <strong style="color: #333;">Fecha:</strong><br>
                                <span style="color: #2c3e50;">${fechaFormateada}</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                            <span style="color: ${colorEstado}; font-size: 14px;">🏷️</span>
                            <div>
                                <strong style="color: #333;">Estado:</strong><br>
                                <span style="
                                    background: ${colorEstado};
                                    color: white;
                                    padding: 4px 12px;
                                    border-radius: 20px;
                                    font-size: 12px;
                                    font-weight: bold;
                                ">${reporte.estado}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Botón de acción -->
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                        <button onclick="window.mapaSistema.getManager('popups').abrirComentarios(${reporte.id_reporte})"
                                style="
                                    background: linear-gradient(135deg, #3498db, #2980b9);
                                    color: white;
                                    border: none;
                                    padding: 12px 20px;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    cursor: pointer;
                                    width: 100%;
                                    font-weight: bold;
                                    transition: all 0.3s ease;
                                "
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 15px rgba(52, 152, 219, 0.3)';"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                            💬 Ver Comentarios
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    _crearHTMLImagenes(reporte) {
        const totalImagenes = reporte.imagenes.length;
        let html = `
            <div style="margin: 15px 0; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                <div style="background: #f8f9fa; padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: #333; font-size: 13px;">📸 Imágenes del Reporte</strong>
                    <span style="color: #666; font-size: 11px; background: #e9ecef; padding: 2px 8px; border-radius: 10px;">
                        ${totalImagenes} ${totalImagenes === 1 ? 'imagen' : 'imágenes'}
                    </span>
                </div>
                <div style="padding: 10px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
        `;

        const imagenesAMostrar = reporte.imagenes.slice(0, 6);

        imagenesAMostrar.forEach((urlImagen, index) => {
            const esUltima = index === 5 && totalImagenes > 6;

            if (esUltima) {
                html += `
                    <div style="position: relative; display: inline-block; cursor: pointer;"
                        onclick="window.mapaSistema.getManager('gallery').mostrarGaleria(${reporte.id_reporte})">
                        <div style="width: 80px; height: 80px; background: #6c757d; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">
                            +${totalImagenes - 5}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div style="position: relative; display: inline-block;">
                        <img
                            src="${urlImagen}"
                            alt="Imagen ${index + 1}"
                            style="
                                width: 80px;
                                height: 80px;
                                object-fit: cover;
                                border-radius: 6px;
                                cursor: pointer;
                                border: 2px solid transparent;
                                transition: all 0.3s ease;
                                background: #f8f9fa;
                            "
                            onerror="this.style.display='none'"
                            onclick="window.mapaSistema.getManager('gallery').mostrarGaleria(${reporte.id_reporte}, ${index})"
                            onmouseover="this.style.borderColor='#3498db'; this.style.transform='scale(1.05)'"
                            onmouseout="this.style.borderColor='transparent'; this.style.transform='scale(1)'"
                            loading="lazy"
                        />
                        <div style="position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.7); color: white; padding: 1px 4px; border-radius: 3px; font-size: 9px;">
                            ${index + 1}
                        </div>
                    </div>
                `;
            }
        });

        html += `
                </div>
                <div style="background: #f8f9fa; padding: 8px 10px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <small style="color: #666; font-size: 11px;">
                        ${totalImagenes > 6 ? `Haz clic para ver las ${totalImagenes} imágenes` : 'Haz clic en las imágenes para ampliar'}
                    </small>
                </div>
            </div>
        `;

        return html;
    }

    _ajustarBrillo(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;

        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    abrirComentarios(idReporte) {
        // Integrar con ComentariosManager
        if (typeof ComentariosManager !== 'undefined') {
            ComentariosManager.abrirComentarios(idReporte);
        }
    }
}
