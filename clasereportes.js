class ReporteCollection {
    constructor() {
        this.filas = document.querySelectorAll('#tabla-reportes tbody tr');
        
    }
    createIterador() {
        return new ReporteIterador(this);
    }
}

class ReporteIterador {
    constructor(filas) {
        this.filas = filas;
        this.index=0;
    }
    //Verifica si hay un siguiente elemento en el recorrido
    hasNext() {
        return this.index < this.filas.filas.length;
    }

    //Retorna el siguiente elemento del recorrido
    next() {
        return this.hasNext() ? this.filas.filas[this.index++] : null;
    }

}

function filterReportesByEstado(estado) {
    const reportes = new ReporteCollection();
    const iterador = reportes.createIterador();

    let fila=iterador.next();
    while (fila ){
        const badge = fila.querySelector('.badge');
        if (badge){
            const estadoFila = badge.textContent.trim();
            fila.style.display = (estado || estadoFila === estado) ? '' : 'none';
        }
        fila=iterador.next();
    }
    }
    document.addEventListener('change', (event) => {
        if(e.target && e.target.id === 'filtroEstadoReporte'){
            filterReportesByEstado(e.target.value);
        }    
    });
