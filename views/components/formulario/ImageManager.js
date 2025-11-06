import { FormConstants } from './utils/Constants.js';
import { FormHelpers } from './utils/Helpers.js';

export class ImageManager {
    constructor(formManager) {
        this.formManager = formManager;
        this.selectedFiles = new DataTransfer();
        this.fileReferences = new Map(); // Mapa para mantener referencia a los File objects
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

            fileInput.addEventListener('change', (e) => {
                console.log('📁 Archivos seleccionados:', e.target.files);
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
        const files = e.target.files;
        const previewContainer = document.querySelector('.preview');
        const sinImagen = document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN);

        if (files && files.length > 0) {
            sinImagen.style.display = 'none';

            const existingPreviews = previewContainer.querySelectorAll('.imagen-previa').length;
            const totalAfterAddition = existingPreviews + files.length;

            if (totalAfterAddition > FormConstants.MAX_IMAGES) {
                this.showFileError(`Máximo ${FormConstants.MAX_IMAGES} imágenes permitidas. Ya tienes ${existingPreviews} imágenes.`);
                e.target.value = '';
                return;
            }

            this.processFiles(files, previewContainer, sinImagen);
        }
    }

    clearPreviews() {
        const previewContainer = document.querySelector('.preview');
        previewContainer.querySelectorAll('.imagen-previa').forEach(img => img.remove());
        this.fileReferences.clear(); // Limpiar referencias
        this.selectedFiles = new DataTransfer(); // Limpiar selectedFiles también

        const previewImg = document.querySelector(FormConstants.SELECTORS.PREVIEW_IMG);
        previewImg.style.display = 'none';
        previewImg.src = '';
    }

    processFiles(files, previewContainer, sinImagen) {
        let validFilesCount = 0;

        for (const [index, file] of Array.from(files).entries()) {
            if (!this.validateFile(file)) continue;

            validFilesCount++;
            this.createImagePreview(file, previewContainer, index);
        }

        if (validFilesCount > 0) {
            this.showFileSuccess(validFilesCount);
            this.updateFileInput(); // Actualizar el input con todos los archivos
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

    createImagePreview(file, previewContainer, index) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'imagen-previa';
            imgContainer.dataset.fileId = `file-${Date.now()}-${index}`; // ID único
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
            previewContainer.insertBefore(imgContainer, document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN));

            FormHelpers.showElement(imgContainer);

            // Guardar referencia al File object original
            this.fileReferences.set(imgContainer.dataset.fileId, file);

            // ACTUALIZACIÓN CRÍTICA: Agregar también a selectedFiles
            this.selectedFiles.items.add(file);
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
        // Eliminar la referencia del archivo
        if (container.dataset.fileId) {
            const file = this.fileReferences.get(container.dataset.fileId);
            this.fileReferences.delete(container.dataset.fileId);

            // ACTUALIZACIÓN CRÍTICA: Remover también de selectedFiles
            if (file) {
                const newDataTransfer = new DataTransfer();
                Array.from(this.selectedFiles.files).forEach(existingFile => {
                    if (existingFile !== file) {
                        newDataTransfer.items.add(existingFile);
                    }
                });
                this.selectedFiles = newDataTransfer;
            }
        }

        container.remove();
        this.updateFileInput();

        const previewContainer = document.querySelector('.preview');
        if (previewContainer.querySelectorAll('.imagen-previa').length === 0) {
            document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN).style.display = 'block';
        }
    }

    updateFileInput() {
        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
        const dataTransfer = new DataTransfer();

        // Agregar TODOS los archivos de las referencias
        this.fileReferences.forEach((file, fileId) => {
            dataTransfer.items.add(file);
        });

        fileInput.files = dataTransfer.files;

        console.log('📁 Archivos en input:', fileInput.files.length);
        console.log('📁 Referencias guardadas:', this.fileReferences.size);
        console.log('📁 SelectedFiles:', this.selectedFiles.files.length); // Debug
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
            fileBtn.innerHTML = `📁 ${fileCount} archivos seleccionados`;
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
        this.clearPreviews();
        document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN).style.display = 'block';

        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
        fileInput.value = '';
    }

    // Método para agregar archivos desde la cámara (si es necesario)
    addFileFromCamera(file) {
        const previewContainer = document.querySelector('.preview');
        const sinImagen = document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN);

        sinImagen.style.display = 'none';
        this.createImagePreview(file, previewContainer, 'camera');
        this.updateFileInput();
    }

    // Método para obtener los archivos seleccionados (para el formulario)
    getSelectedFiles() {
        return this.selectedFiles.files;
    }
}
