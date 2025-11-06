import { FormConstants } from './utils/Constants.js';
import { FormHelpers } from './utils/Helpers.js';

export class ImageManager {
    constructor(formManager) {
        this.formManager = formManager;
        this.selectedFiles = new DataTransfer(); // fuente de verdad de archivos
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
        const fileBtn = document.querySelector(FormConstants.SELECTORS.BTN_SELECCIONAR_ARCHIVO);

        console.log('🔍 ImageManager - Elementos:', { fileInput, fileBtn });

        if (fileInput && fileBtn) {
            fileBtn.addEventListener('click', () => {
                console.log('🖱️ Botón clickeado - Abriendo selector de archivos...');
                fileInput.click();
            });

            // Manejar selección de archivos: **append**, no replace
            fileInput.addEventListener('change', (e) => {
                console.log('📁 Archivos seleccionados (raw):', e.target.files);
                this.handleFileSelection(e);
            });
        } else {
            console.error('Elementos no encontrados:', {
                fileInput: !!fileInput,
                fileBtn: !!fileBtn
            });
        }
    }

    handleFileSelection(e) {
        const newFiles = Array.from(e.target.files || []);
        const previewContainer = document.querySelector('.preview');
        const sinImagen = document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN);

        if (!sinImagen || !previewContainer) {
            console.error('Contenedores de previsualización no encontrados');
            return;
        }

        // Validar límite total: (archivos ya en selectedFiles) + (nuevos) <= MAX_IMAGES
        const totalAfter = this.selectedFiles.files.length + newFiles.length;
        if (totalAfter > FormConstants.MAX_IMAGES) {
            this.showFileError(`Máximo ${FormConstants.MAX_IMAGES} imágenes permitidas (ya tiene ${this.selectedFiles.files.length})`);
            // limpiar input para evitar confusión
            e.target.value = '';
            return;
        }

        if (newFiles.length === 0) {
            // nada seleccionado
            if (this.selectedFiles.files.length === 0) {
                sinImagen.style.display = 'block';
            }
            return;
        }

        // Procesar únicamente los archivos nuevos válidos:
        const validNewFiles = [];
        for (const file of newFiles) {
            if (!this.validateFile(file)) continue;
            validNewFiles.push(file);
        }

        if (validNewFiles.length === 0) {
            e.target.value = '';
            if (this.selectedFiles.files.length === 0) sinImagen.style.display = 'block';
            return;
        }

        // Añadir nuevos archivos al DataTransfer (fuente de verdad)
        for (const file of validNewFiles) {
            this.selectedFiles.items.add(file);
        }

        // Actualizar el input físico con el DataTransfer combinado
        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
        fileInput.files = this.selectedFiles.files;

        // Ocultar mensaje "sin imagen"
        sinImagen.style.display = 'none';

        // Crear vistas en el DOM para los nuevos archivos
        this.processFiles(validNewFiles, previewContainer, sinImagen);

        // Limpiar el input nativo para que futuras selecciones no concatenten dos veces el mismo FileList por error
        e.target.value = '';
    }

    clearPreviews() {
        const previewContainer = document.querySelector('.preview');
        previewContainer.querySelectorAll('.imagen-previa').forEach(img => img.remove());

        const previewImg = document.querySelector(FormConstants.SELECTORS.PREVIEW_IMG);
        if (previewImg) {
            previewImg.style.display = 'none';
            previewImg.src = '';
        }
    }

    processFiles(files, previewContainer, sinImagen) {
        let validFilesCount = 0;

        for (const file of files) {
            // validateFile ya fue aplicado en handleFileSelection, pero doble chequeo no hace daño
            if (!this.validateFile(file)) continue;

            validFilesCount++;
            this.createImagePreview(file, previewContainer);
        }

        if (validFilesCount > 0) {
            this.showFileSuccess(validFilesCount);
        } else {
            sinImagen.style.display = 'block';
        }
    }

    validateFile(file) {
        if (!FormHelpers.isValidImageFile(file)) {
            this.showFileError(`"${file.name}" no es una imagen válida`);
            return false;
        }

        if (!FormHelpers.isFileSizeValid(file)) {
            this.showFileError(`La imagen "${file.name}" supera los 5MB`);
            return false;
        }

        return true;
    }

    createImagePreview(file, previewContainer) {
        const reader = new FileReader();
        const identifier = `${file.name}_${file.size}_${file.lastModified}`;

        reader.onload = (e) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'imagen-previa';
            imgContainer.dataset.fileId = identifier; // asociación con el File

            imgContainer.style.cssText = `
                position: relative;
                display: inline-block;
                margin: 5px;
                border-radius: 8px;
                overflow: hidden;
                border: 2px solid #e5e7eb;
                transition: all 0.3s ease;
            `;

            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            img.style.cssText = `
                width: 80px;
                height: 80px;
                object-fit: cover;
                display: block;
            `;

            const deleteBtn = this.createDeleteButton(imgContainer);

            this.setupPreviewInteractions(imgContainer, deleteBtn);

            imgContainer.appendChild(img);
            imgContainer.appendChild(deleteBtn);
            // Insertar antes del texto "sin imagen" si existe
            const sinImagen = document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN);
            if (sinImagen && sinImagen.parentElement) {
                previewContainer.insertBefore(imgContainer, sinImagen);
            } else {
                previewContainer.appendChild(imgContainer);
            }

            FormHelpers.showElement(imgContainer);
        };

        reader.readAsDataURL(file);
    }

    createDeleteButton(container) {
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '×';
        deleteBtn.style.cssText = `
            position: absolute;
            top: 2px;
            right: 2px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            border: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImagePreview(container);
        });

        return deleteBtn;
    }

    setupPreviewInteractions(container, deleteBtn) {
        container.addEventListener('mouseenter', () => {
            deleteBtn.style.opacity = '1';
            container.style.borderColor = FormConstants.STYLES.PRIMARY_COLOR;
            container.style.transform = 'scale(1.05)';
        });

        container.addEventListener('mouseleave', () => {
            deleteBtn.style.opacity = '0';
            container.style.borderColor = '#e5e7eb';
            container.style.transform = 'scale(1)';
        });
    }

    removeImagePreview(container) {
        // obtener id del archivo asociado
        const fileId = container.dataset.fileId;
        if (fileId) {
            // reconstruir DataTransfer sin el archivo eliminado
            const newDT = new DataTransfer();
            for (const file of this.selectedFiles.files) {
                const id = `${file.name}_${file.size}_${file.lastModified}`;
                if (id !== fileId) {
                    newDT.items.add(file);
                }
            }
            this.selectedFiles = newDT;

            // actualizar input físico
            const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
            if (fileInput) {
                fileInput.files = this.selectedFiles.files;
            }
        }

        // quitar vista
        container.remove();

        const previewContainer = document.querySelector('.preview');
        if (previewContainer.querySelectorAll('.imagen-previa').length === 0) {
            document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN).style.display = 'block';
        }
    }

    updateFileInput() {
        // Ahora esto es simple: fileInput refleja selectedFiles
        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
        if (fileInput) {
            fileInput.files = this.selectedFiles.files;
        }
    }

    showFileError(message) {
        this.formManager.showAlert(message, 'error');

        FormHelpers.addTemporaryStyle(
            document.querySelector('.campo-imagen'),
            {
                borderColor: FormConstants.STYLES.ERROR_COLOR,
                backgroundColor: '#fef2f2'
            },
            2000
        );
    }

    showFileSuccess(fileCount) {
        const message = fileCount === 1 ?
            FormConstants.MESSAGES.SUCCESS.IMAGE_LOADED :
            `✅ ${fileCount}${FormConstants.MESSAGES.SUCCESS.IMAGES_LOADED}`;

        this.formManager.showAlert(message);

        if (fileCount > 1) {
            this.updateFileButtonText(fileCount);
        }
    }

    updateFileButtonText(fileCount) {
        const fileBtn = document.querySelector(FormConstants.SELECTORS.BTN_SELECCIONAR_ARCHIVO);
        if (fileBtn) {
            fileBtn.innerHTML = `📁 ${this.selectedFiles.files.length} archivos seleccionados`;
            FormHelpers.addTemporaryStyle(
                fileBtn,
                {
                    background: FormConstants.STYLES.SUCCESS_COLOR,
                    color: 'white'
                },
                3000
            );

            setTimeout(() => {
                fileBtn.innerHTML = '📁 Seleccionar Archivos';
            }, 3000);
        }
    }

    clearImages() {
        // limpiar previews y DataTransfer
        this.clearPreviews();
        document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN).style.display = 'block';

        this.selectedFiles = new DataTransfer();
        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
        if (fileInput) fileInput.value = '';
    }
}
