import { FormConstants } from './utils/Constants.js';
import { FormHelpers } from './utils/Helpers.js';

export class ImageManager {
    constructor(formManager) {
        this.formManager = formManager;
        this.selectedFiles = new DataTransfer();
        this.currentPreviews = []; // Array para trackear previews existentes
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
        const fileBtn = document.querySelector(FormConstants.SELECTORS.BTN_SELECCIONAR_ARCHIVO);

        console.log('🔍 ImageManager - Elementos:', { fileInput, fileBtn });

        if (fileInput && fileBtn) {
            // CONECTAR BOTÓN AL INPUT FILE
            fileBtn.addEventListener('click', () => {
                console.log('🖱️ Botón clickeado - Abriendo selector de archivos...');
                fileInput.click();
            });

            // Manejar selección de archivos
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
        const sinImagen = document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN);

        if (!files || files.length === 0) {
            // Si no hay archivos seleccionados y no hay previews existentes, mostrar "sin imagen"
            if (this.currentPreviews.length === 0) {
                sinImagen.style.display = 'block';
            }
            return;
        }

        // Verificar límite total (existentes + nuevos)
        const totalAfterAddition = this.currentPreviews.length + files.length;
        if (totalAfterAddition > FormConstants.MAX_IMAGES) {
            this.showFileError(`Máximo ${FormConstants.MAX_IMAGES} imágenes permitidas. Ya tienes ${this.currentPreviews.length} imágenes.`);
            e.target.value = '';
            return;
        }

        // Ocultar "sin imagen" si vamos a agregar archivos
        sinImagen.style.display = 'none';

        // Procesar los nuevos archivos
        this.processFiles(files);

        // Limpiar el input para permitir seleccionar los mismos archivos otra vez
        e.target.value = '';
    }

    processFiles(files) {
        let validFilesCount = 0;
        const previewContainer = document.querySelector('.preview');

        for (const file of Array.from(files)) {
            if (!this.validateFile(file)) continue;

            validFilesCount++;
            this.createImagePreview(file, previewContainer);
        }

        if (validFilesCount > 0) {
            this.showFileSuccess(validFilesCount);
            this.updateFileInput();
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

        // Verificar si el archivo ya existe
        if (this.isFileAlreadyAdded(file)) {
            this.showFileError(`"${file.name}" ya fue agregado`);
            return false;
        }

        return true;
    }

    isFileAlreadyAdded(file) {
        return this.currentPreviews.some(preview =>
            preview.file.name === file.name &&
            preview.file.size === file.size &&
            preview.file.type === file.type
        );
    }

    createImagePreview(file, previewContainer) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'imagen-previa';
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

            // Guardar referencia del preview
            this.currentPreviews.push({
                container: imgContainer,
                file: file,
                element: img
            });

            // Agregar archivo a DataTransfer
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
        // Encontrar y remover del array currentPreviews
        const index = this.currentPreviews.findIndex(preview => preview.container === container);
        if (index !== -1) {
            const removedFile = this.currentPreviews[index].file;
            this.currentPreviews.splice(index, 1);

            // Remover del DataTransfer
            const newDataTransfer = new DataTransfer();
            Array.from(this.selectedFiles.files).forEach(file => {
                if (file !== removedFile) {
                    newDataTransfer.items.add(file);
                }
            });
            this.selectedFiles = newDataTransfer;
        }

        container.remove();
        this.updateFileInput();

        // Mostrar "sin imagen" si no hay previews
        if (this.currentPreviews.length === 0) {
            document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN).style.display = 'block';
        }

        this.updateFileButtonText();
    }

    updateFileInput() {
        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);

        // Crear un nuevo DataTransfer con todos los archivos actuales
        const dataTransfer = new DataTransfer();
        this.currentPreviews.forEach(preview => {
            dataTransfer.items.add(preview.file);
        });

        fileInput.files = dataTransfer.files;

        console.log('📁 Archivos actuales en input:', fileInput.files.length);
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
        this.updateFileButtonText();
    }

    updateFileButtonText() {
        const fileBtn = document.querySelector(FormConstants.SELECTORS.BTN_SELECCIONAR_ARCHIVO);
        if (fileBtn) {
            const totalFiles = this.currentPreviews.length;

            if (totalFiles > 0) {
                fileBtn.innerHTML = `📁 ${totalFiles} archivo${totalFiles > 1 ? 's' : ''} seleccionado${totalFiles > 1 ? 's' : ''}`;
                FormHelpers.addTemporaryStyle(
                    fileBtn,
                    {
                        background: FormConstants.STYLES.SUCCESS_COLOR,
                        color: 'white'
                    },
                    2000
                );
            } else {
                fileBtn.innerHTML = '📁 Seleccionar Archivos';
            }
        }
    }

    clearImages() {
        // Limpiar previews visuales
        const previewContainer = document.querySelector('.preview');
        previewContainer.querySelectorAll('.imagen-previa').forEach(img => img.remove());

        // Limpiar arrays y DataTransfer
        this.currentPreviews = [];
        this.selectedFiles = new DataTransfer();

        // Actualizar input
        this.updateFileInput();

        // Mostrar "sin imagen"
        document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN).style.display = 'block';
        this.updateFileButtonText();
    }

    // Método para obtener los archivos actuales (útil para el formulario)
    getCurrentFiles() {
        return this.selectedFiles.files;
    }

    // Método para verificar si hay imágenes
    hasImages() {
        return this.currentPreviews.length > 0;
    }
}
