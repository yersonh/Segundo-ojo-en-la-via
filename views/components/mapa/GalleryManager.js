import { ErrorHandler } from './utils/ErrorHandler.js';

export class GalleryManager {
    constructor() {
        this.galeriaActual = null;
        this.indiceActual = 0;
        this.reportesCache = new Map();
    }

    async mostrarGaleria(idReporte, indiceInicial = 0) {
        try {
            console.log('🖼️ Abriendo galería para reporte:', idReporte);

            // Obtener datos del reporte
            const reporte = await this._obtenerReporte(idReporte);
            if (!reporte) {
                throw new Error('Reporte no encontrado');
            }

            const imagenes = reporte.imagenes || [];
            if (imagenes.length === 0) {
                this._mostrarAlerta('No hay imágenes para este reporte', 'info');
                return;
            }

            this._crearOverlayGaleria(idReporte, imagenes, indiceInicial);

        } catch (error) {
            ErrorHandler.mostrarError('Error al mostrar galería', error);
            this._mostrarAlerta('Error al cargar la galería', 'error');
        }
    }

    async _obtenerReporte(idReporte) {
        if (this.reportesCache.has(idReporte)) {
            return this.reportesCache.get(idReporte);
        }

        try {
            const response = await fetch('../../controllers/reportecontrolador.php?action=listar');
            if (!response.ok) throw new Error('Error al obtener reportes');

            const reportes = await response.json();
            const reporte = reportes.find(r => r.id_reporte == idReporte);

            if (reporte) {
                this.reportesCache.set(idReporte, reporte);
            }

            return reporte;
        } catch (error) {
            throw new Error(`No se pudo cargar el reporte: ${error.message}`);
        }
    }

    _crearOverlayGaleria(idReporte, imagenes, indiceInicial) {
        // Remover galería anterior si existe
        this.cerrarGaleria();

        this.indiceActual = indiceInicial;
        this.galeriaActual = { idReporte, imagenes };

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'galeria-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        // Contenedor principal
        const galeriaContainer = document.createElement('div');
        galeriaContainer.style.cssText = `
            width: 90%;
            height: 90%;
            display: flex;
            flex-direction: column;
            background: #1a1a1a;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        // Ensamblar componentes
        galeriaContainer.appendChild(this._crearHeaderGaleria(idReporte, imagenes));
        galeriaContainer.appendChild(this._crearAreaImagen(imagenes));
        galeriaContainer.appendChild(this._crearControles(imagenes));

        overlay.appendChild(galeriaContainer);
        overlay.appendChild(this._crearBotonCerrar());

        document.body.appendChild(overlay);

        this._configurarEventosTeclado();

        console.log('✅ Galería mostrada correctamente');
    }

    _crearHeaderGaleria(idReporte, imagenes) {
        const header = document.createElement('div');
        header.style.cssText = `
            background: #2d2d2d;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #404040;
        `;

        header.innerHTML = `
            <div style="color: white; font-weight: 600; font-size: 16px;">
                📸 Galería - Reporte #${idReporte}
            </div>
            <div style="color: #a0a0a0; font-size: 14px;">
                ${this.indiceActual + 1} de ${imagenes.length}
            </div>
        `;

        return header;
    }

    _crearAreaImagen(imagenes) {
        const imagenContainer = document.createElement('div');
        imagenContainer.style.cssText = `
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: #000;
            cursor: default;
            overflow: hidden;
            position: relative;
        `;

        const imgPrincipal = document.createElement('img');
        imgPrincipal.src = imagenes[this.indiceActual];
        imgPrincipal.alt = `Imagen ${this.indiceActual + 1} del reporte`;
        imgPrincipal.style.cssText = `
            max-width: 95%;
            max-height: 95%;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            transition: transform 0.3s ease;
            cursor: zoom-in;
        `;

        // Configurar zoom
        this._configurarZoomImagen(imgPrincipal);

        imagenContainer.appendChild(imgPrincipal);
        return imagenContainer;
    }

    _configurarZoomImagen(imgElement) {
        let scale = 1;
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;

        const resetZoom = () => {
            scale = 1;
            translateX = 0;
            translateY = 0;
            imgElement.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        };

        // Zoom con rueda del mouse
        imgElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -e.deltaY / 100;
            scale += delta * 0.1;
            scale = Math.min(Math.max(0.5, scale), 3);
            imgElement.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        });

        // Doble clic para resetear zoom
        imgElement.addEventListener('dblclick', resetZoom);

        return resetZoom;
    }

    _crearControles(imagenes) {
        const controles = document.createElement('div');
        controles.style.cssText = `
            background: #2d2d2d;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #404040;
        `;

        // Botón anterior
        const btnAnterior = this._crearBotonNavegacion(
            '← Anterior',
            this.indiceActual === 0,
            () => this._navegarImagen(-1, imagenes)
        );

        // Indicadores
        const indicadores = this._crearIndicadores(imagenes);

        // Botón siguiente
        const btnSiguiente = this._crearBotonNavegacion(
            'Siguiente →',
            this.indiceActual === imagenes.length - 1,
            () => this._navegarImagen(1, imagenes)
        );

        controles.appendChild(btnAnterior);
        controles.appendChild(indicadores);
        controles.appendChild(btnSiguiente);

        return controles;
    }

    _crearBotonNavegacion(texto, deshabilitado, onClick) {
        const boton = document.createElement('button');
        boton.textContent = texto;
        boton.disabled = deshabilitado;
        boton.style.cssText = `
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            opacity: ${deshabilitado ? '0.5' : '1'};
            transition: all 0.3s ease;
        `;

        if (!deshabilitado) {
            boton.addEventListener('mouseover', () => {
                boton.style.background = '#2563eb';
                boton.style.transform = 'translateY(-1px)';
            });

            boton.addEventListener('mouseout', () => {
                boton.style.background = '#3b82f6';
                boton.style.transform = 'translateY(0)';
            });
        }

        boton.addEventListener('click', onClick);

        return boton;
    }

    _crearIndicadores(imagenes) {
        const contenedor = document.createElement('div');
        contenedor.style.cssText = 'display: flex; gap: 8px; align-items: center;';

        imagenes.forEach((_, index) => {
            const punto = document.createElement('div');
            punto.style.cssText = `
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${index === this.indiceActual ? '#3b82f6' : '#666'};
                cursor: pointer;
                transition: background 0.3s ease;
            `;

            punto.addEventListener('click', () => {
                this._navegarAImagen(index, imagenes);
            });

            contenedor.appendChild(punto);
        });

        return contenedor;
    }

    _crearBotonCerrar() {
        const boton = document.createElement('button');
        boton.innerHTML = '×';
        boton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            transition: all 0.3s ease;
        `;

        boton.addEventListener('mouseover', () => {
            boton.style.background = '#ef4444';
            boton.style.transform = 'scale(1.1)';
        });

        boton.addEventListener('mouseout', () => {
            boton.style.background = 'rgba(239, 68, 68, 0.9)';
            boton.style.transform = 'scale(1)';
        });

        boton.addEventListener('click', () => {
            this.cerrarGaleria();
        });

        return boton;
    }

    _configurarEventosTeclado() {
        this._keyHandler = (e) => {
            if (!this.galeriaActual) return;

            switch(e.key) {
                case 'Escape':
                    this.cerrarGaleria();
                    break;
                case 'ArrowLeft':
                    this._navegarImagen(-1, this.galeriaActual.imagenes);
                    break;
                case 'ArrowRight':
                    this._navegarImagen(1, this.galeriaActual.imagenes);
                    break;
            }
        };

        document.addEventListener('keydown', this._keyHandler);
    }

    _navegarImagen(direccion, imagenes) {
        const nuevoIndice = this.indiceActual + direccion;
        if (nuevoIndice >= 0 && nuevoIndice < imagenes.length) {
            this._navegarAImagen(nuevoIndice, imagenes);
        }
    }

    _navegarAImagen(nuevoIndice, imagenes) {
        this.indiceActual = nuevoIndice;

        // Actualizar imagen
        const imgPrincipal = document.querySelector('.galeria-overlay img');
        if (imgPrincipal) {
            imgPrincipal.src = imagenes[nuevoIndice];
            imgPrincipal.alt = `Imagen ${nuevoIndice + 1} del reporte`;
            imgPrincipal.style.transform = 'scale(1)'; // Reset zoom
        }

        // Actualizar contador
        const contador = document.querySelector('.galeria-overlay div:last-child');
        if (contador) {
            contador.textContent = `${nuevoIndice + 1} de ${imagenes.length}`;
        }

        // Actualizar indicadores
        this._actualizarIndicadores(nuevoIndice, imagenes.length);

        // Actualizar estado de botones
        this._actualizarBotonesNavegacion(nuevoIndice, imagenes.length);
    }

    _actualizarIndicadores(indiceActual, totalImagenes) {
        const puntos = document.querySelectorAll('.galeria-overlay div[style*="width: 8px"]');
        puntos.forEach((punto, index) => {
            punto.style.background = index === indiceActual ? '#3b82f6' : '#666';
        });
    }

    _actualizarBotonesNavegacion(indiceActual, totalImagenes) {
        const botones = document.querySelectorAll('.galeria-overlay button');
        if (botones.length >= 2) {
            // Botón anterior
            botones[0].disabled = indiceActual === 0;
            botones[0].style.opacity = indiceActual === 0 ? '0.5' : '1';

            // Botón siguiente
            botones[1].disabled = indiceActual === totalImagenes - 1;
            botones[1].style.opacity = indiceActual === totalImagenes - 1 ? '0.5' : '1';
        }
    }

    _mostrarAlerta(mensaje, tipo = 'info') {
        // Usar el sistema de alertas existente o crear uno simple
        const alerta = document.createElement('div');
        alerta.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${tipo === 'error' ? '#f8d7da' : '#d1edff'};
            color: ${tipo === 'error' ? '#721c24' : '#004085'};
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        alerta.textContent = mensaje;

        document.body.appendChild(alerta);

        setTimeout(() => {
            if (alerta.parentNode) {
                alerta.parentNode.removeChild(alerta);
            }
        }, 3000);
    }

    cerrarGaleria() {
        const overlay = document.querySelector('.galeria-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }

        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }

        this.galeriaActual = null;
        this.indiceActual = 0;
    }

    // Método para mostrar imagen individual
    mostrarImagenGrande(urlImagen) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;

        const img = document.createElement('img');
        img.src = urlImagen;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            transition: all 0.3s ease;
        `;

        closeBtn.addEventListener('mouseover', function() {
            this.style.background = '#ef4444';
            this.style.transform = 'scale(1.1)';
        });

        closeBtn.addEventListener('mouseout', function() {
            this.style.background = 'rgba(239, 68, 68, 0.9)';
            this.style.transform = 'scale(1)';
        });

        const closeHandler = () => {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', keyHandler);
        };

        overlay.addEventListener('click', closeHandler);
        closeBtn.addEventListener('click', closeHandler);

        const keyHandler = (e) => {
            if (e.key === 'Escape') closeHandler();
        };

        document.addEventListener('keydown', keyHandler);

        overlay.appendChild(img);
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);
    }

    limpiarCache() {
        this.reportesCache.clear();
    }
}
