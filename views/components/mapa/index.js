// Punto de entrada principal para el sistema de mapas
import { MapaManager } from './MapaManager.js';
import { MarkerManager } from './MarkerManager.js';
import { GeolocationManager } from './GeolocationManager.js';
import { PopupManager } from './PopupManager.js';
import { GalleryManager } from './GalleryManager.js';

// Exportar todos los managers
export {
    MapaManager,
    MarkerManager,
    GeolocationManager,
    PopupManager,
    GalleryManager
};

// Manager principal que orquesta todos los componentes
export class SistemaMapa {
    constructor() {
        this.mapaManager = new MapaManager();
        this.markerManager = new MarkerManager(this.mapaManager);
        this.geolocationManager = new GeolocationManager(this.mapaManager);
        this.popupManager = new PopupManager();
        this.galleryManager = new GalleryManager();
        
        this._configurarIntegraciones();
    }
    
    _configurarIntegraciones() {
        // Conectar managers entre sí
        this.markerManager.setPopupManager(this.popupManager);
        this.popupManager.setGalleryManager(this.galleryManager);
        
        // Registrar managers en el mapa principal
        this.mapaManager.setManager('markers', this.markerManager);
        this.mapaManager.setManager('geolocation', this.geolocationManager);
        this.mapaManager.setManager('popups', this.popupManager);
        this.mapaManager.setManager('gallery', this.galleryManager);
    }
    
    async inicializar(containerId = 'map') {
        try {
            console.log('🚀 Inicializando sistema de mapas...');
            
            // Inicializar en orden
            this.mapaManager.inicializar(containerId);
            this.markerManager.inicializar();
            this.geolocationManager.inicializar();
            
            // Cargar datos iniciales
            await this.markerManager.cargarReportes();
            
            console.log('🎉 Sistema de mapas completamente inicializado');
            return this;
        } catch (error) {
            console.error('❌ Error al inicializar sistema de mapas:', error);
            throw error;
        }
    }
    
    // Métodos de conveniencia para acceso rápido
    getMap() {
        return this.mapaManager.getMap();
    }
    
    getManager(nombre) {
        return this.mapaManager.getManager(nombre);
    }
    
    async recargarReportes() {
        return await this.markerManager.cargarReportes();
    }
    
    mostrarUbicacionUsuario() {
        return this.geolocationManager.obtenerUbicacionActual();
    }
    
    seleccionarUbicacion(latlng) {
        return this.mapaManager.seleccionarUbicacion(latlng);
    }
    
    mostrarGaleria(idReporte, indiceInicial = 0) {
        return this.galleryManager.mostrarGaleria(idReporte, indiceInicial);
    }
    
    destruir() {
        this.mapaManager.destruir();
        this.geolocationManager.limpiar();
        this.galleryManager.cerrarGaleria();
        this.galleryManager.limpiarCache();
    }
}

// Exportar instancia singleton para uso global
export const mapaSistema = new SistemaMapa();