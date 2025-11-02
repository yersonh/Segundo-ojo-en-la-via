// Módulo para gestionar comentarios
const ComentariosManager = {
    inicializado: false, // 🆕 Bandera para evitar inicialización múltiple

    inicializar() {
        if (this.inicializado) {
            console.log('⚠️ ComentariosManager ya estaba inicializado');
            return;
        }

        this.configurarEventos();
        this.inicializado = true;
        console.log('✅ ComentariosManager inicializado');
    },

    configurarEventos() {
        const formComentario = document.getElementById('formComentario');
        if (formComentario) {
            // 🆕 Remover event listeners anteriores para evitar duplicados
            formComentario.removeEventListener('submit', this.manejadorSubmit);

            // Crear manejador con bind para mantener el contexto
            this.manejadorSubmit = this.agregarComentario.bind(this);
            formComentario.addEventListener('submit', this.manejadorSubmit);
        }

        // Contador de caracteres
        const textoComentario = document.getElementById('textoComentario');
        if (textoComentario) {
            textoComentario.addEventListener('input', this.actualizarContadorCaracteres);
        }

        // Cerrar modal al hacer clic fuera
        const modalOverlay = document.getElementById('comentariosSection');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.cerrarComentarios();
                }
            });
        }
    },

    actualizarContadorCaracteres() {
        const contador = document.getElementById('comentarioChars');
        if (contador) {
            contador.textContent = this.value.length;

            // Cambiar color si se acerca al límite
            if (this.value.length > 450) {
                contador.style.color = '#e74c3c';
            } else if (this.value.length > 400) {
                contador.style.color = '#f39c12';
            } else {
                contador.style.color = '#6c757d';
            }
        }
    },

    async cargarComentarios(id_reporte) {
        try {
            const comentariosList = document.getElementById('comentariosList');
            if (!comentariosList) {
                console.error('❌ Elemento comentariosList no encontrado');
                return;
            }

            comentariosList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Cargando comentarios...</p></div>';

            const resp = await fetch(`../../controllers/reportecontrolador.php?action=listar_comentarios&id_reporte=${id_reporte}`);

            if (!resp.ok) {
                throw new Error(`Error HTTP: ${resp.status}`);
            }

            const comentarios = await resp.json();

            comentariosList.innerHTML = '';

            if (!Array.isArray(comentarios) || comentarios.length === 0) {
                comentariosList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No hay comentarios aún. Sé el primero en comentar.</p>';
                return;
            }

            comentarios.forEach(comentario => {
                // 🆕 CORREGIDO: Formato de fecha mejorado
                const fecha = this.formatearFecha(comentario.fecha_comentario);

                const comentarioHTML = `
                    <div class="comentario-item">
                        <div class="comentario-header">
                            <span class="comentario-usuario">${this.escapeHtml(comentario.nombres || '')} ${this.escapeHtml(comentario.apellidos || '')}</span>
                            <span class="comentario-fecha">${fecha}</span>
                        </div>
                        <div class="comentario-texto">${this.escapeHtml(comentario.comentario || '')}</div>
                    </div>
                `;
                comentariosList.innerHTML += comentarioHTML;
            });

        } catch (error) {
            console.error('Error al cargar comentarios:', error);
            const comentariosList = document.getElementById('comentariosList');
            if (comentariosList) {
                comentariosList.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px;">Error al cargar comentarios</p>';
            }
        }
    },

    async agregarComentario(e) {
    e.preventDefault();

    if (this.enviando) {
        console.log('⚠️ Ya se está enviando un comentario');
        return;
    }

    this.enviando = true;

    const formData = new FormData(e.target);
    const btnComentario = document.getElementById('btnComentario');
    const textoComentario = document.getElementById('textoComentario');
    const id_reporte = formData.get('id_reporte');
    const id_usuario = window.usuarioId;

    if (!btnComentario || !textoComentario) {
        console.error('❌ Elementos del formulario no encontrados');
        this.enviando = false;
        return;
    }

    formData.append('id_usuario', id_usuario);

    btnComentario.disabled = true;
    btnComentario.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

    try {
        const resp = await fetch('../../controllers/reportecontrolador.php?action=agregar_comentario', {
            method: 'POST',
            body: formData
        });

        const result = await resp.json();

        if (result.success) {
            textoComentario.value = '';
            this.actualizarContadorCaracteres.call(textoComentario);

            // Recargar comentarios silenciosamente
            await this.cargarComentarios(id_reporte);

            console.log('✅ Comentario agregado correctamente');

            // ✅ NOTIFICAR AL DUEÑO DEL REPORTE
            await this.notificarComentario(id_reporte, id_usuario);

            // Actualizar contador en el post
            this.actualizarContadorEnPost(id_reporte);

        } else {
            console.error('Error al agregar comentario:', result.mensaje || result.error);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
    } finally {
        btnComentario.disabled = false;
        btnComentario.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Comentario';
        this.enviando = false;
    }
},
// ✅ FUNCIÓN PARA NOTIFICAR COMENTARIO
async notificarComentario(id_reporte, id_usuario_origen) {
    try {
        // Obtener el dueño del reporte
        const resp = await fetch(`../../controllers/reportecontrolador.php?action=obtener_propietario&id_reporte=${id_reporte}`);
        const data = await resp.json();

        if (data.success && data.id_usuario_destino && data.id_usuario_destino !== id_usuario_origen) {
            const formData = new FormData();
            formData.append('id_reporte', id_reporte);
            formData.append('id_usuario_origen', id_usuario_origen);
            formData.append('id_usuario_destino', data.id_usuario_destino);

            await fetch('../../controllers/notificacion_controlador.php?action=notificar_comentario', {
                method: 'POST',
                body: formData
            });
        }
    } catch (error) {
        console.error('Error notificando comentario:', error);
    }
},

    abrirComentarios(id_reporte) {
        const comentarioIdReporte = document.getElementById('comentarioIdReporte');
        const comentarioIdUsuario = document.getElementById('comentarioIdUsuario');
        const comentariosSection = document.getElementById('comentariosSection');

        if (!comentarioIdReporte || !comentariosSection) {
            console.error('❌ Elementos necesarios para comentarios no encontrados');
            return;
        }

        // Establecer valores
        comentarioIdReporte.value = id_reporte;
        if (comentarioIdUsuario) {
            comentarioIdUsuario.value = window.usuarioId || '';
        }

        // Mostrar sección
        comentariosSection.style.display = 'flex';

        // Cargar comentarios
        this.cargarComentarios(id_reporte);

        // Enfocar el textarea
        setTimeout(() => {
            const textoComentario = document.getElementById('textoComentario');
            if (textoComentario) {
                textoComentario.focus();
            }
        }, 300);
    },

    cerrarComentarios() {
        const comentariosSection = document.getElementById('comentariosSection');
        if (comentariosSection) {
            comentariosSection.style.display = 'none';
        }

        // Limpiar formulario
        const textoComentario = document.getElementById('textoComentario');
        if (textoComentario) {
            textoComentario.value = '';
            this.actualizarContadorCaracteres.call(textoComentario);
        }
    },

    // 🆕 FUNCIÓN PARA FORMATEAR FECHA CORRECTAMENTE
    formatearFecha(fechaString) {
        try {
            const fecha = new Date(fechaString);

            // Verificar si la fecha es válida
            if (isNaN(fecha.getTime())) {
                return 'Fecha no disponible';
            }

            // Ajustar por zona horaria (UTC a hora local)
            const fechaLocal = new Date(fecha.getTime() + (fecha.getTimezoneOffset() * 60000));

            // Formatear en español
            return fechaLocal.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

        } catch (e) {
            console.error('Error formateando fecha:', e);
            return 'Fecha no disponible';
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    ComentariosManager.inicializar();
});
