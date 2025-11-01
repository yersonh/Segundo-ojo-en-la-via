// Punto de entrada principal para el sistema de formularios
import FormManager from './FormManager.js'; // Importación por defecto
import { ValidationManager } from './ValidationManager.js';
import { UIManager } from './UIManager.js';
import { ImageManager } from './ImageManager.js';
import { CameraManager } from './CameraManager.js';

// Re-exportar todos los managers para uso individual
export { FormManager, ValidationManager, UIManager, ImageManager, CameraManager };

// Sistema principal que orquesta todos los componentes
export class SistemaFormulario {
    constructor() {
        this.formManager = new FormManager();
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        
        try {
            this.formManager.initialize();
            this.initialized = true;
            console.log('🎉 Sistema de formularios completamente inicializado');
            return this;
        } catch (error) {
            console.error('❌ Error al inicializar sistema de formularios:', error);
            throw error;
        }
    }

    // Métodos de conveniencia para acceso rápido
    getFormManager() {
        return this.formManager;
    }

    updateCoordinates(lat, lng) {
        this.formManager.updateCoordinates(lat, lng);
    }

    clearForm() {
        this.formManager.clearForm();
    }

    handleConnectionChange(online) {
        this.formManager.handleConnectionChange(online);
    }

    // Método para backward compatibility
    limpiarFormulario() {
        this.formManager.limpiarFormulario();
    }
}

// Exportar instancia singleton para uso global
export const formularioSistema = new SistemaFormulario();

// Exportar para uso tradicional (backward compatibility)
export const FormularioManager = formularioSistema;