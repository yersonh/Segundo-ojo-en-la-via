import { FormConstants } from './utils/Constants.js';
import { FormHelpers } from './utils/Helpers.js';

export class ImageManager {
    constructor(formManager) {
        this.formManager = formManager;
        this.selectedFiles = new DataTransfer();
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
        const previewContainer = document.querySelector('.preview');
        const sinImagen = document.querySelector(FormConstants.SELECTORS.SIN_IMAGEN);

        // SOLUCIÓN: NO limpiar previews existentes, solo procesar nuevos archivos
        if (files && files.length > 0) {
            sinImagen.style.display = 'none';

            // Verificar límite total (existentes + nuevos)
            const existingPreviews = previewContainer.querySelectorAll('.imagen-previa').length;
            const totalAfterAddition = existingPreviews + files.length;

            if (totalAfterAddition > FormConstants.MAX_IMAGES) {
                this.showFileError(`Máximo ${FormConstants.MAX_IMAGES} imágenes permitidas. Ya tienes ${existingPreviews} imágenes.`);
                e.target.value = '';
                return;
            }

            this.processFiles(files, previewContainer, sinImagen);
        }
        // No cambiar el estado de "sin imagen" si ya hay previews existentes
    }

    clearPreviews() {
        const previewContainer = document.querySelector('.preview');
        previewContainer.querySelectorAll('.imagen-previa').forEach(img => img.remove());

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
        // No mostrar "sin imagen" si hay previews existentes
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

        // Agregar TODOS los archivos de TODOS los previews existentes
        const previewContainer = document.querySelector('.preview');
        const existingPreviews = Array.from(previewContainer.querySelectorAll('.imagen-previa img'));

        // Por cada preview existente, agregar al DataTransfer
        existingPreviews.forEach((img, index) => {
            // Crear un archivo desde la data URL (esto es simplificado)
            // En un caso real, necesitarías mantener referencia a los File objects originales
            if (img.src.startsWith('data:')) {
                // Convertir data URL a blob y luego a File
                fetch(img.src)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], `image_${index}.jpg`, { type: 'image/jpeg' });
                        dataTransfer.items.add(file);
                    });
            }
        });

        fileInput.files = dataTransfer.files;
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
}
