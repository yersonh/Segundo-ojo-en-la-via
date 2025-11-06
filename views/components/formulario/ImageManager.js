import { FormConstants } from './utils/Constants.js';
import { FormHelpers } from './utils/Helpers.js';

export class ImageManager {
    constructor(formManager) {
        this.formManager = formManager;
        this.currentFiles = []; // Array para mantener TODOS los archivos
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

            // Verificar límite total
            const totalAfterAddition = this.currentFiles.length + files.length;
            if (totalAfterAddition > FormConstants.MAX_IMAGES) {
                this.showFileError(`Máximo ${FormConstants.MAX_IMAGES} imágenes permitidas. Ya tienes ${this.currentFiles.length} imágenes.`);
                e.target.value = '';
                return;
            }

            this.processFiles(files, previewContainer);
            e.target.value = ''; // Limpiar input para permitir seleccionar los mismos archivos otra vez
        }
    }

    clearPreviews() {
        const previewContainer = document.querySelector('.preview');
        previewContainer.querySelectorAll('.imagen-previa').forEach(img => img.remove());
        this.currentFiles = []; // Limpiar array de archivos

        const previewImg = document.querySelector(FormConstants.SELECTORS.PREVIEW_IMG);
        previewImg.style.display = 'none';
        previewImg.src = '';
    }

    processFiles(files, previewContainer) {
        let validFilesCount = 0;

        for (const file of Array.from(files)) {
            if (!this.validateFile(file)) continue;

            // Verificar si el archivo ya existe (evitar duplicados)
            if (this.isFileAlreadyAdded(file)) {
                console.log('⚠️ Archivo duplicado:', file.name);
                continue;
            }

            validFilesCount++;
            this.currentFiles.push(file); // Agregar al array de archivos
            this.createImagePreview(file, previewContainer, this.currentFiles.length - 1);
        }

        if (validFilesCount > 0) {
            this.showFileSuccess(validFilesCount);
            this.updateFileInput(); // Actualizar el input file
        }
    }

    isFileAlreadyAdded(file) {
        return this.currentFiles.some(existingFile =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified
        );
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
            imgContainer.dataset.fileIndex = index; // Guardar índice del archivo
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
        const fileIndex = parseInt(container.dataset.fileIndex);

        // Eliminar el archivo del array
        if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < this.currentFiles.length) {
            this.currentFiles.splice(fileIndex, 1);
        }

        container.remove();
        this.updateFileInput();

        // Actualizar índices de los previews restantes
        this.updatePreviewIndexes();

        const previewContainer = document.querySelector('.preview');
        if (previewContainer.querySelectorAll('.imagen-previa').length === 0) {
            document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN).style.display = 'block';
        }
    }

    updatePreviewIndexes() {
        const previews = document.querySelectorAll('.imagen-previa');
        previews.forEach((preview, index) => {
            preview.dataset.fileIndex = index;
        });
    }

    updateFileInput() {
        const fileInput = document.querySelector(FormConstants.SELECTORS.FOTO);
        const dataTransfer = new DataTransfer();

        // Agregar TODOS los archivos del array al DataTransfer
        this.currentFiles.forEach(file => {
            dataTransfer.items.add(file);
        });

        fileInput.files = dataTransfer.files;

        console.log('📁 Archivos actuales:', this.currentFiles.length);
        console.log('📁 Archivos en input:', fileInput.files.length);

        // Actualizar texto del botón
        this.updateFileButtonText();
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
    }

    updateFileButtonText() {
        const fileBtn = document.querySelector(FormConstants.SELECTORS.BTN_SELECCIONAR_ARCHIVO);
        if (fileBtn) {
            const totalFiles = this.currentFiles.length;

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
        this.clearPreviews();
        document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN).style.display = 'block';
    }

    // Método para agregar archivos desde la cámara
    addFileFromCamera(file) {
        const previewContainer = document.querySelector('.preview');
        const sinImagen = document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN);

        // Verificar límite
        if (this.currentFiles.length >= FormConstants.MAX_IMAGES) {
            this.showFileError(`Máximo ${FormConstants.MAX_IMAGES} imágenes permitidas`);
            return;
        }

        sinImagen.style.display = 'none';
        this.currentFiles.push(file);
        this.createImagePreview(file, previewContainer, this.currentFiles.length - 1);
        this.updateFileInput();

        this.showFileSuccess(1);
    }

    // Método para obtener los archivos actuales
    getFiles() {
        return this.currentFiles;
    }

    // Método para verificar si hay imágenes
    hasImages() {
        return this.currentFiles.length > 0;
    }
}
