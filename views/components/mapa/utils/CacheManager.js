export class CacheManager {
    constructor() {
        this.cache = new Map();
    }
    
    set(clave, datos, ttl = Config.cache.reportesTTL) {
        this.cache.set(clave, {
            data: datos,
            timestamp: Date.now(),
            ttl: ttl
        });
    }
    
    get(clave) {
        const cached = this.cache.get(clave);
        
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(clave);
            return null;
        }
        
        return cached.data;
    }
    
    clear() {
        this.cache.clear();
    }
    
    async obtenerConCache(clave, fetchFunction, ttl = null) {
        const cached = this.get(clave);
        if (cached) {
            return cached;
        }
        
        try {
            const data = await fetchFunction();
            this.set(clave, data, ttl);
            return data;
        } catch (error) {
            ErrorHandler.mostrarError(`Error al obtener datos para cache: ${clave}`, error);
            throw error;
        }
    }
}