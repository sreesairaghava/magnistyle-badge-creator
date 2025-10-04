// Polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (radius === 0) {
            this.rect(x, y, width, height);
            return;
        }
        
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.arcTo(x + width, y, x + width, y + radius, radius);
        this.lineTo(x + width, y + height - radius);
        this.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.lineTo(x + radius, y + height);
        this.arcTo(x, y + height, x, y + height - radius, radius);
        this.lineTo(x, y + radius);
        this.arcTo(x, y, x + radius, y, radius);
    };
}

class BadgeTemplateCreator {
    constructor() {
        // Single badge mode properties
        this.currentImage = null;
        this.originalImageData = null;
        this.cropData = null;
        this.isCropping = false;
        
        // Grid mode properties
        this.gridSlots = Array(12).fill(null); // 12 slots for 3x4 grid
        this.selectedSlots = new Set();
        this.currentMode = 'grid';
        this.currentSelectedSlot = null; // Track which slot is currently being edited
        
        // Canvas references
        this.mainCanvas = document.getElementById('mainCanvas');
        this.mainCtx = this.mainCanvas ? this.mainCanvas.getContext('2d') : null;
        this.templateCanvas = document.getElementById('templateCanvas');
        this.templateCtx = this.templateCanvas ? this.templateCanvas.getContext('2d') : null;
        
        // Dimensions in pixels at 300 DPI (mm * 11.811)
        this.dimensions = {
            design: { width: 590, height: 590 }, // 50mm (matches badge size)
            badge: { width: 590, height: 590 },  // 50mm
            dieCut: { width: 720, height: 720 }, // 61mm
            rotary: { width: 779, height: 779 }  // 66mm
        };
        
        this.initializeEventListeners();
        console.log('Initializing BadgeTemplateCreator...');
        this.initializeGrid();
        this.switchMode('grid'); // Set A4 Grid as default mode
        this.updateUI();
        this.drawTemplate();
        this.updateGridDisplay(); // Initialize grid guides state
        this.initializePreviewModal();
        this.initializeCollapsiblePanel();
        this.initializeAdjustmentsPanel();
        this.initializeImagePreview();
        this.updateUploadStats(); // Initialize upload stats
        console.log('BadgeTemplateCreator initialized');
    }
    
    initializeEventListeners() {
        // Mode switching
        document.getElementById('singleModeTab').addEventListener('click', () => this.switchMode('single'));
        document.getElementById('gridModeTab').addEventListener('click', () => this.switchMode('grid'));
        
        // Single mode file upload
        const dropZone = document.getElementById('dropZone');
        const imageInput = document.getElementById('imageInput');
        
        dropZone.addEventListener('click', () => imageInput.click());
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropZone.addEventListener('drop', this.handleSingleDrop.bind(this));
        imageInput.addEventListener('change', this.handleSingleFileSelect.bind(this));
        
        // Grid mode file upload
        const gridDropZone = document.getElementById('gridDropZone');
        const gridImageInput = document.getElementById('gridImageInput');
        
        gridDropZone.addEventListener('click', () => gridImageInput.click());
        gridDropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        gridDropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        gridDropZone.addEventListener('drop', this.handleGridDrop.bind(this));
        gridImageInput.addEventListener('change', this.handleGridFileSelect.bind(this));
        
        // Image adjustments (single mode)
        const brightness = document.getElementById('brightness');
        if (brightness) brightness.addEventListener('input', this.onAdjustmentChange.bind(this));
        
        const contrast = document.getElementById('contrast');
        if (contrast) contrast.addEventListener('input', this.onAdjustmentChange.bind(this));
        
        const saturation = document.getElementById('saturation');
        if (saturation) saturation.addEventListener('input', this.onAdjustmentChange.bind(this));
        
        const cornerRadius = document.getElementById('cornerRadius');
        if (cornerRadius) cornerRadius.addEventListener('input', this.onAdjustmentChange.bind(this));
        
        const badgeMargin = document.getElementById('badgeMargin');
        if (badgeMargin) badgeMargin.addEventListener('input', this.onMarginChange.bind(this));
        
        // Image adjustments (grid mode)
        const gridBrightness = document.getElementById('gridBrightness');
        if (gridBrightness) gridBrightness.addEventListener('input', this.onAdjustmentChange.bind(this));
        
        const gridContrast = document.getElementById('gridContrast');
        if (gridContrast) gridContrast.addEventListener('input', this.onAdjustmentChange.bind(this));
        
        const gridSaturation = document.getElementById('gridSaturation');
        if (gridSaturation) gridSaturation.addEventListener('input', this.onAdjustmentChange.bind(this));
        
        const gridCornerRadius = document.getElementById('gridCornerRadius');
        if (gridCornerRadius) gridCornerRadius.addEventListener('input', this.onAdjustmentChange.bind(this));
        
        const gridBadgeMargin = document.getElementById('gridBadgeMargin');
        if (gridBadgeMargin) gridBadgeMargin.addEventListener('input', this.onMarginChange.bind(this));
        
        // Reset adjustments button
        const gridResetAdjustments = document.getElementById('gridResetAdjustments');
        if (gridResetAdjustments) gridResetAdjustments.addEventListener('click', this.resetGridAdjustments.bind(this));
        
        // Image scaling and positioning controls
        const imageScale = document.getElementById('imageScale');
        if (imageScale) imageScale.addEventListener('input', this.onImageScaleChange.bind(this));
        
        const scaleDown = document.getElementById('scaleDown');
        if (scaleDown) scaleDown.addEventListener('click', () => this.adjustScale(-5));
        
        const scaleUp = document.getElementById('scaleUp');
        if (scaleUp) scaleUp.addEventListener('click', () => this.adjustScale(5));
        
        // Position controls
        const moveUp = document.getElementById('moveUp');
        if (moveUp) moveUp.addEventListener('click', () => this.adjustPosition(0, -2));
        
        const moveDown = document.getElementById('moveDown');
        if (moveDown) moveDown.addEventListener('click', () => this.adjustPosition(0, 2));
        
        const moveLeft = document.getElementById('moveLeft');
        if (moveLeft) moveLeft.addEventListener('click', () => this.adjustPosition(-2, 0));
        
        const moveRight = document.getElementById('moveRight');
        if (moveRight) moveRight.addEventListener('click', () => this.adjustPosition(2, 0));
        
        // Rotation controls
        const imageRotation = document.getElementById('imageRotation');
        if (imageRotation) imageRotation.addEventListener('input', this.onImageRotationChange.bind(this));
        
        const rotateLeft = document.getElementById('rotateLeft');
        if (rotateLeft) rotateLeft.addEventListener('click', () => this.adjustRotation(-15));
        
        const rotateRight = document.getElementById('rotateRight');
        if (rotateRight) rotateRight.addEventListener('click', () => this.adjustRotation(15));
        
        // Flip controls
        const flipHorizontal = document.getElementById('flipHorizontal');
        if (flipHorizontal) flipHorizontal.addEventListener('click', this.toggleFlipHorizontal.bind(this));
        
        const flipVertical = document.getElementById('flipVertical');
        if (flipVertical) flipVertical.addEventListener('click', this.toggleFlipVertical.bind(this));
        
        // Fit mode controls
        const fitButtons = document.querySelectorAll('.fit-btn');
        fitButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.setFitMode(e.target.dataset.mode));
        });
        
        // Crop controls
        const cropTop = document.getElementById('cropTop');
        if (cropTop) cropTop.addEventListener('input', this.onCropChange.bind(this));
        
        const cropBottom = document.getElementById('cropBottom');
        if (cropBottom) cropBottom.addEventListener('input', this.onCropChange.bind(this));
        
        const cropLeft = document.getElementById('cropLeft');
        if (cropLeft) cropLeft.addEventListener('input', this.onCropChange.bind(this));
        
        const cropRight = document.getElementById('cropRight');
        if (cropRight) cropRight.addEventListener('input', this.onCropChange.bind(this));
        
        // Fine zoom controls
        const fineZoom = document.getElementById('fineZoom');
        if (fineZoom) fineZoom.addEventListener('input', this.onFineZoomChange.bind(this));
        
        const zoomIn = document.getElementById('zoomIn');
        if (zoomIn) zoomIn.addEventListener('click', () => this.adjustFineZoom(5));
        
        const zoomOut = document.getElementById('zoomOut');
        if (zoomOut) zoomOut.addEventListener('click', () => this.adjustFineZoom(-5));
        
        const resetImageTransform = document.getElementById('resetImageTransform');
        if (resetImageTransform) resetImageTransform.addEventListener('click', this.resetImageTransform.bind(this));
        
        const applyTransformToSelected = document.getElementById('applyTransformToSelected');
        if (applyTransformToSelected) applyTransformToSelected.addEventListener('click', this.applyTransformToSelected.bind(this));
        
        // Background controls
        const bgBtns = document.querySelectorAll('.bg-btn');
        bgBtns.forEach(btn => {
            btn.addEventListener('click', this.onBackgroundModeChange.bind(this));
        });
        
        const backgroundColor = document.getElementById('backgroundColor');
        if (backgroundColor) backgroundColor.addEventListener('change', this.onBackgroundColorChange.bind(this));
        
        const backgroundBlur = document.getElementById('backgroundBlur');
        if (backgroundBlur) backgroundBlur.addEventListener('input', this.onBackgroundBlurChange.bind(this));
        
        // Grid mode checkboxes
        const gridShowGuides = document.getElementById('gridShowGuides');
        if (gridShowGuides) gridShowGuides.addEventListener('change', this.drawTemplate.bind(this));
        
        const showGridGuides = document.getElementById('showGridGuides');
        if (showGridGuides) showGridGuides.addEventListener('change', () => {
            this.updateGridDisplay();
            // Redraw all grid slots to show/hide guides
            for (let i = 0; i < this.gridSlots.length; i++) {
                if (this.gridSlots[i]) {
                    this.redrawSlotCanvas(i);
                }
            }
            // Update preview as well
            this.updateImagePreview();
            // Simple test to verify toggle is working
            const isChecked = document.getElementById('showGridGuides').checked;
            console.log('Grid guides toggle:', isChecked ? 'ON' : 'OFF');
        });
        
        const gridTemplateOpacity = document.getElementById('gridTemplateOpacity');
        if (gridTemplateOpacity) gridTemplateOpacity.addEventListener('input', this.updateTemplateOpacity.bind(this));
        
        // Batch controls (only if elements exist)
        const applyToAll = document.getElementById('applyToAll');
        if (applyToAll) applyToAll.addEventListener('click', this.applyToAll.bind(this));
        
        const resetAdjustments = document.getElementById('resetAdjustments');
        if (resetAdjustments) resetAdjustments.addEventListener('click', this.resetAdjustments.bind(this));
        
        // Single mode crop controls
        const singleCropTop = document.getElementById('singleCropTop');
        if (singleCropTop) singleCropTop.addEventListener('input', this.onSingleCropChange.bind(this));

        const singleCropBottom = document.getElementById('singleCropBottom');
        if (singleCropBottom) singleCropBottom.addEventListener('input', this.onSingleCropChange.bind(this));

        const singleCropLeft = document.getElementById('singleCropLeft');
        if (singleCropLeft) singleCropLeft.addEventListener('input', this.onSingleCropChange.bind(this));

        const singleCropRight = document.getElementById('singleCropRight');
        if (singleCropRight) singleCropRight.addEventListener('input', this.onSingleCropChange.bind(this));

        const resetCrop = document.getElementById('resetCrop');
        if (resetCrop) resetCrop.addEventListener('click', this.resetSingleCrop.bind(this));
        
        // Grid controls
        document.getElementById('selectAllSlots').addEventListener('click', this.selectAllSlots.bind(this));
        document.getElementById('deselectAllSlots').addEventListener('click', this.deselectAllSlots.bind(this));
        document.getElementById('fillEmptySlots').addEventListener('click', this.fillEmptySlots.bind(this));
        document.getElementById('clearAllSlots').addEventListener('click', this.clearAllSlots.bind(this));
        
        // Template controls
        document.getElementById('templateOpacity').addEventListener('input', this.updateTemplateOpacity.bind(this));
        document.getElementById('showGuides').addEventListener('change', this.drawTemplate.bind(this));
        document.getElementById('showGridGuides').addEventListener('change', () => {
            this.updateGridDisplay();
            // Redraw all grid slots to show/hide guides
            for (let i = 0; i < this.gridSlots.length; i++) {
                if (this.gridSlots[i]) {
                    this.redrawSlotCanvas(i);
                }
            }
            // Update preview as well
            this.updateImagePreview();
            // Simple test to verify toggle is working
            const isChecked = document.getElementById('showGridGuides').checked;
            console.log('Grid guides toggle:', isChecked ? 'ON' : 'OFF');
        });
        
        // Export (single mode)
        const previewPDF = document.getElementById('previewPDF');
        if (previewPDF) previewPDF.addEventListener('click', this.previewPDF.bind(this));
        
        const downloadPDF = document.getElementById('downloadPDF');
        if (downloadPDF) downloadPDF.addEventListener('click', this.downloadPDF.bind(this));
        
        // Export (grid mode)
        const gridPreviewPDF = document.getElementById('gridPreviewPDF');
        if (gridPreviewPDF) gridPreviewPDF.addEventListener('click', this.previewPDF.bind(this));
        
        const gridDownloadPDF = document.getElementById('gridDownloadPDF');
        if (gridDownloadPDF) gridDownloadPDF.addEventListener('click', this.downloadPDF.bind(this));
        
        // Update value displays
        this.updateValueDisplays();
        
        // Add window resize handler for responsive canvas
        window.addEventListener('resize', () => {
            if (this.currentImage && this.currentMode === 'single') {
                this.drawMainCanvas();
                this.drawTemplate();
            }
        });
    }
    
    initializeGrid() {
        const gridContainer = document.getElementById('a4Grid');
        console.log('Grid container found:', gridContainer);
        if (!gridContainer) {
            console.error('Grid container not found!');
            return;
        }
        gridContainer.innerHTML = '';
        
        for (let i = 0; i < 12; i++) {
            const slot = document.createElement('div');
            slot.className = 'grid-slot empty';
            slot.dataset.slotIndex = i;
            slot.title = 'Click to upload image';
            
            // Add slot number
            const slotNumber = document.createElement('div');
            slotNumber.className = 'slot-number';
            slotNumber.textContent = i + 1;
            slot.appendChild(slotNumber);
            
            // Add slot controls
            const controls = document.createElement('div');
            controls.className = 'slot-controls';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'slot-control-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Remove image';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.removeSlotImage(i);
            });
            
            controls.appendChild(deleteBtn);
            slot.appendChild(controls);
            
            // Add click handler for selection and file upload
            slot.addEventListener('click', (e) => this.handleSlotClick(i, e));
            
            // Add touch-friendly handlers for mobile
            if ('ontouchstart' in window) {
                slot.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleSlotClick(i, e);
                });
            }
            
            // Add drag and drop handlers for reordering (only when slot has content)
            slot.addEventListener('dragstart', (e) => this.handleSlotDragStart(e, i));
            slot.addEventListener('dragover', this.handleSlotDragOver.bind(this));
            slot.addEventListener('dragleave', this.handleSlotDragLeave.bind(this));
            slot.addEventListener('drop', (e) => this.handleSlotDrop(e, i));
            slot.addEventListener('dragend', this.handleSlotDragEnd.bind(this));
            
            gridContainer.appendChild(slot);
        }
        console.log('Grid slots created:', gridContainer.children.length);
        console.log('Grid container HTML:', gridContainer.innerHTML.substring(0, 200) + '...');
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update tab buttons
        document.getElementById('singleModeTab').classList.toggle('active', mode === 'single');
        document.getElementById('gridModeTab').classList.toggle('active', mode === 'grid');
        
        // Update mode content visibility
        document.getElementById('singleMode').classList.toggle('hidden', mode !== 'single');
        document.getElementById('gridMode').classList.toggle('hidden', mode !== 'grid');
        
        this.updateUI();
        this.drawTemplate();
    }
    
    updateUI() {
        const isSingleMode = this.currentMode === 'single';
        const hasGridSelection = this.selectedSlots.size > 0;
        const hasGridImages = this.gridSlots.some(slot => slot !== null);
        
        console.log('updateUI - hasGridImages:', hasGridImages, 'gridSlots:', this.gridSlots.map((slot, i) => slot ? `slot${i}:image` : `slot${i}:null`));
        
        // Update upload stats
        this.updateUploadStats();
        
        // Show/hide batch controls (only if element exists)
        const batchControls = document.getElementById('batchControls');
        if (batchControls) batchControls.classList.toggle('hidden', isSingleMode);
        
        // Show/hide crop controls (only if element exists)
        const cropGroup = document.getElementById('cropGroup');
        if (cropGroup) cropGroup.classList.toggle('hidden', !isSingleMode);
        
        // Show/hide grid-specific controls (only if element exists)
        const showGridGuidesContainer = document.getElementById('showGridGuidesContainer');
        if (showGridGuidesContainer) showGridGuidesContainer.classList.toggle('hidden', isSingleMode);
        
        // Update batch control states (only if elements exist)
        const applyToSelected = document.getElementById('applyToSelected');
        if (applyToSelected) applyToSelected.disabled = !hasGridSelection;
        
        const applyToAll = document.getElementById('applyToAll');
        if (applyToAll) applyToAll.disabled = !hasGridImages;
        
        // Update grid control states
        if (!isSingleMode) {
            const hasSelectedImage = Array.from(this.selectedSlots).some(slotIndex => this.gridSlots[slotIndex]);
            
            const fillEmptySlots = document.getElementById('fillEmptySlots');
            if (fillEmptySlots) fillEmptySlots.disabled = !this.getFirstImageSlot() && !hasSelectedImage;
            
            const clearAllSlots = document.getElementById('clearAllSlots');
            if (clearAllSlots) clearAllSlots.disabled = !hasGridImages;
            
            // Update select all button text based on selection state
            const selectAllBtn = document.getElementById('selectAllSlots');
            const deselectAllBtn = document.getElementById('deselectAllSlots');
            
            if (selectAllBtn && deselectAllBtn) {
                if (this.selectedSlots.size === 12) {
                    selectAllBtn.textContent = 'Deselect All';
                    deselectAllBtn.disabled = false;
                } else if (this.selectedSlots.size === 0) {
                    selectAllBtn.textContent = 'Select All';
                    deselectAllBtn.disabled = true;
                } else {
                    selectAllBtn.textContent = 'Select All';
                    deselectAllBtn.disabled = false;
                }
            }
        }
        
        // Update export button
        const downloadBtn = isSingleMode ? document.getElementById('downloadPDF') : document.getElementById('gridDownloadPDF');
        const downloadText = isSingleMode ? document.getElementById('downloadText') : document.getElementById('gridDownloadText');
        const exportSize = document.getElementById('exportSize');
        
        if (downloadBtn) {
            if (isSingleMode) {
                downloadBtn.disabled = !this.currentImage;
                if (downloadText) downloadText.textContent = 'Download PDF';
                if (exportSize) exportSize.textContent = 'Size: 66×66mm (with margin)';
            } else {
                downloadBtn.disabled = !hasGridImages;
                if (downloadText) downloadText.textContent = 'Download A4 PDF';
                if (exportSize) exportSize.textContent = 'Size: A4 (210×297mm)';
            }
        }
        
        // Update selection count
        const selectionCount = document.getElementById('selectionCount');
        const selectionInfo = document.querySelector('.selection-info');
        if (selectionCount) {
            selectionCount.textContent = `${this.selectedSlots.size} selected`;
        }
        if (selectionInfo) {
            if (this.selectedSlots.size > 0) {
                selectionInfo.classList.add('has-selection');
            } else {
                selectionInfo.classList.remove('has-selection');
            }
        }
        
        // Update image preview
        this.updateImagePreview();
        
        // Update preview button
        const previewBtn = isSingleMode ? document.getElementById('previewPDF') : document.getElementById('gridPreviewPDF');
        if (previewBtn) {
            if (isSingleMode) {
                previewBtn.disabled = !this.currentImage;
            } else {
                previewBtn.disabled = !hasGridImages;
            }
        }
    }
    
    initializePreviewModal() {
        // Close modal events (only if elements exist)
        const closePreview = document.getElementById('closePreview');
        if (closePreview) closePreview.addEventListener('click', () => this.closePreviewModal());
        
        const printFromPreview = document.getElementById('printFromPreview');
        if (printFromPreview) printFromPreview.addEventListener('click', () => this.printPreview());
        
        const downloadFromPreview = document.getElementById('downloadFromPreview');
        if (downloadFromPreview) downloadFromPreview.addEventListener('click', () => {
            this.closePreviewModal();
            this.downloadPDF();
        });
        
        // Close modal on backdrop click
        const previewModal = document.getElementById('previewModal');
        if (previewModal) previewModal.addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') {
                this.closePreviewModal();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('previewModal').classList.contains('hidden')) {
                this.closePreviewModal();
            }
        });
    }
    
    initializeCollapsiblePanel() {
        const toggleBtn = document.getElementById('togglePanel');
        const panel = document.getElementById('gridControlsPanel');
        const workspace = document.querySelector('.grid-workspace');
        
        if (toggleBtn && panel && workspace) {
            // Start expanded by default on desktop, collapsed on mobile
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                panel.classList.add('collapsed');
                workspace.classList.add('controls-collapsed');
            } else {
                panel.classList.add('expanded');
                workspace.classList.remove('controls-collapsed');
            }
            
            toggleBtn.addEventListener('click', () => {
                if (panel.classList.contains('expanded')) {
                    panel.classList.remove('expanded');
                    panel.classList.add('collapsed');
                    workspace.classList.add('controls-collapsed');
                } else {
                    panel.classList.remove('collapsed');
                    panel.classList.add('expanded');
                    workspace.classList.remove('controls-collapsed');
                }
            });
            
            // Handle window resize
            window.addEventListener('resize', () => {
                const isMobileNow = window.innerWidth <= 768;
                if (isMobileNow && panel.classList.contains('expanded')) {
                    panel.classList.remove('expanded');
                    panel.classList.add('collapsed');
                    workspace.classList.add('controls-collapsed');
                } else if (!isMobileNow && panel.classList.contains('collapsed')) {
                    panel.classList.remove('collapsed');
                    panel.classList.add('expanded');
                    workspace.classList.remove('controls-collapsed');
                }
            });
        }
    }
    
    initializeAdjustmentsPanel() {
        const toggleBtn = document.getElementById('toggleAdjustmentsPanel');
        const panel = document.getElementById('gridAdjustmentsPanel');
        const workspace = document.querySelector('.grid-workspace');
        
        if (toggleBtn && panel && workspace) {
            // Start expanded by default on desktop, collapsed on mobile
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                panel.classList.add('collapsed');
                workspace.classList.add('adjustments-collapsed');
            } else {
                panel.classList.add('expanded');
                workspace.classList.remove('adjustments-collapsed');
            }
            
            toggleBtn.addEventListener('click', () => {
                if (panel.classList.contains('expanded')) {
                    panel.classList.remove('expanded');
                    panel.classList.add('collapsed');
                    workspace.classList.add('adjustments-collapsed');
                } else {
                    panel.classList.remove('collapsed');
                    panel.classList.add('expanded');
                    workspace.classList.remove('adjustments-collapsed');
                }
            });
            
            // Handle window resize
            window.addEventListener('resize', () => {
                const isMobileNow = window.innerWidth <= 768;
                if (isMobileNow && panel.classList.contains('expanded')) {
                    panel.classList.remove('expanded');
                    panel.classList.add('collapsed');
                    workspace.classList.add('adjustments-collapsed');
                } else if (!isMobileNow && panel.classList.contains('collapsed')) {
                    panel.classList.remove('collapsed');
                    panel.classList.add('expanded');
                    workspace.classList.remove('adjustments-collapsed');
                }
            });
        }
    }
    
    initializeImagePreview() {
        this.previewCanvas = document.getElementById('gridImagePreview');
        this.previewSlotInfo = document.getElementById('previewSlotInfo');
        
        if (this.previewCanvas && this.previewSlotInfo) {
            this.updateImagePreview();
        }
    }
    
    updateImagePreview() {
        if (!this.previewCanvas || !this.previewSlotInfo) return;
        
        const ctx = this.previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 200);
        
        // Use currentSelectedSlot if available, otherwise find first selected slot with image
        let selectedImage = null;
        let selectedSlotIndex = -1;
        
        if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
            // Use the currently selected slot (the one being transformed)
            selectedImage = this.gridSlots[this.currentSelectedSlot].image;
            selectedSlotIndex = this.currentSelectedSlot;
        } else {
            // Fallback: find the first selected slot with an image
            for (const slotIndex of this.selectedSlots) {
                if (this.gridSlots[slotIndex]) {
                    selectedImage = this.gridSlots[slotIndex].image;
                    selectedSlotIndex = slotIndex;
                    break;
                }
            }
        }
        
        if (selectedImage) {
            const slotData = this.gridSlots[selectedSlotIndex];
            const img = slotData.image;
            const adjustments = slotData.adjustments;
            const transform = slotData.transform;
            const size = 200;
            
            // Calculate source crop coordinates first
            const sourceCropLeft = (transform.cropLeft / 100) * img.width;
            const sourceCropTop = (transform.cropTop / 100) * img.height;
            const sourceCropWidth = img.width - sourceCropLeft - (transform.cropRight / 100) * img.width;
            const sourceCropHeight = img.height - sourceCropTop - (transform.cropBottom / 100) * img.height;
            
            // Use ORIGINAL dimensions for scaling calculations to prevent zoom-in effect when cropping
            const imageWidth = img.width;
            const imageHeight = img.height;
            
            // Apply user scale and fine zoom
            const userScale = transform.scale / 100;
            const fineZoomScale = transform.fineZoom / 100;
            const totalScale = userScale * fineZoomScale;
            
            // Calculate margin (same as used in PDF generation and grid rendering)
            const userMarginMm = parseFloat(document.getElementById('gridBadgeMargin').value);
            const badgeSizeMm = 66; // Standard badge size
            const imageSizeMm = badgeSizeMm - (2 * userMarginMm);
            const marginRatio = userMarginMm / badgeSizeMm;
            const imageRatio = imageSizeMm / badgeSizeMm;
            
            // Calculate margin and image area in pixels for this preview
            const marginPixels = size * marginRatio;
            const imageAreaSize = size * imageRatio;
            
            let scaledWidth, scaledHeight, offsetX, offsetY;
            
            // Scale based on IMAGE AREA, not full canvas
            switch (transform.fitMode) {
                case 'contain':
                    // Fit entire image within image area (no cropping)
                    const scaleToFit = Math.min(imageAreaSize / imageWidth, imageAreaSize / imageHeight) * totalScale;
                    scaledWidth = sourceCropWidth * scaleToFit;
                    scaledHeight = sourceCropHeight * scaleToFit;
                    offsetX = (imageAreaSize - scaledWidth) / 2;
                    offsetY = (imageAreaSize - scaledHeight) / 2;
                    break;
                    
                case 'fill':
                    // Stretch image to fill entire image area (may distort)
                    const fillScale = imageAreaSize / imageWidth * totalScale;
                    scaledWidth = sourceCropWidth * fillScale;
                    scaledHeight = sourceCropHeight * fillScale;
                    offsetX = (imageAreaSize - scaledWidth) / 2;
                    offsetY = (imageAreaSize - scaledHeight) / 2;
                    break;
                    
                case 'cover':
                default:
                    // Fill image area completely (may crop)
                    const scaleToFill = Math.max(imageAreaSize / imageWidth, imageAreaSize / imageHeight) * totalScale;
                    scaledWidth = sourceCropWidth * scaleToFill;
                    scaledHeight = sourceCropHeight * scaleToFill;
                    offsetX = (imageAreaSize - scaledWidth) / 2;
                    offsetY = (imageAreaSize - scaledHeight) / 2;
                    break;
            }
            
            // Apply user position offsets (within the image area, not the full canvas)
            offsetX += (transform.offsetX / 100) * imageAreaSize;
            offsetY += (transform.offsetY / 100) * imageAreaSize;
            
            // Offset to account for margin
            offsetX += marginPixels;
            offsetY += marginPixels;
            
            // Save context for corner radius clipping (will be applied after transforms)
            ctx.save();
            
            // Apply rotation FIRST (before corner radius) - rotate around IMAGE CENTER, not canvas center
            if (transform.rotation !== 0) {
                const imageCenterX = marginPixels + imageAreaSize / 2;
                const imageCenterY = marginPixels + imageAreaSize / 2;
                ctx.translate(imageCenterX, imageCenterY);
                ctx.rotate((transform.rotation * Math.PI) / 180);
                ctx.translate(-imageCenterX, -imageCenterY);
            }
            
            // Apply corner radius clipping AFTER rotation - to IMAGE AREA, not full canvas
            ctx.beginPath();
            ctx.roundRect(marginPixels, marginPixels, imageAreaSize, imageAreaSize, adjustments.cornerRadius);
            ctx.clip();
            
            // Draw background if image is zoomed out (AFTER clip is applied)
            if (totalScale < 1.0) {
                this.drawBackground(ctx, imageAreaSize, img, transform, marginPixels);
            }
            
            // Apply flip transformations (relative to image area center)
            if (transform.flipHorizontal || transform.flipVertical) {
                ctx.save();
                const imageCenterX = marginPixels + imageAreaSize / 2;
                const imageCenterY = marginPixels + imageAreaSize / 2;
                
                if (transform.flipHorizontal) {
                    ctx.translate(imageCenterX, 0);
                    ctx.scale(-1, 1);
                    ctx.translate(-imageCenterX, 0);
                    offsetX = 2 * imageCenterX - offsetX - scaledWidth;
                }
                if (transform.flipVertical) {
                    ctx.translate(0, imageCenterY);
                    ctx.scale(1, -1);
                    ctx.translate(0, -imageCenterY);
                    offsetY = 2 * imageCenterY - offsetY - scaledHeight;
                }
            }
            
            // Apply adjustments if needed
            if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) {
                // Create temporary canvas for adjustments
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = scaledWidth;
                tempCanvas.height = scaledHeight;
                
                // Draw cropped portion to temp canvas
                tempCtx.drawImage(img, 
                    sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                    0, 0, scaledWidth, scaledHeight);
                const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
                this.applyImageFilters(imageData, adjustments);
                tempCtx.putImageData(imageData, 0, 0);
                
                ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
            } else {
                // Draw cropped portion directly
                ctx.drawImage(img, 
                    sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                    offsetX, offsetY, scaledWidth, scaledHeight);
            }
            
            // Restore flip transformations
            if (transform.flipHorizontal || transform.flipVertical) {
                ctx.restore();
            }
            
            ctx.restore();
            
            // Draw grid guides overlay if enabled
            const showGridGuides = document.getElementById('showGridGuides').checked;
            if (showGridGuides) {
                this.drawGridGuidesOverlay(ctx, size);
            }
            
            // Update slot info with transform details
            this.previewSlotInfo.textContent = `Slot ${selectedSlotIndex + 1} - ${transform.fitMode} (${transform.scale}%)`;
        } else {
            this.previewSlotInfo.textContent = 'No image selected';
        }
    }
    
    drawGridGuidesOverlay(ctx, size) {
        ctx.save();
        
        // Define guide colors
        const cutLineColor = '#ff4444';      // Red for cut lines
        const safeZoneColor = '#4444ff';     // Blue for safe zones  
        const bleedAreaColor = '#44ff44';    // Green for bleed areas
        
        // Calculate dimensions (assuming 66mm badge with margin)
        const badgeMargin = parseFloat(document.getElementById('gridBadgeMargin')?.value || 8);
        const safeMargin = badgeMargin * 0.6; // Safe zone is 60% of margin
        const bleedMargin = badgeMargin * 1.2; // Bleed extends 20% beyond margin
        
        // Convert margins to pixel ratios (size is the canvas size)
        const cutLineOffset = (badgeMargin / 66) * size; // Cut line position
        const safeZoneOffset = (safeMargin / 66) * size; // Safe zone position
        const bleedOffset = (bleedMargin / 66) * size; // Bleed area position
        
        // Set line properties
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]); // Dashed lines
        
        // Draw bleed area (outermost - green)
        if (bleedOffset < size / 2) {
            ctx.strokeStyle = bleedAreaColor;
            ctx.globalAlpha = 0.6;
            ctx.strokeRect(bleedOffset, bleedOffset, size - 2 * bleedOffset, size - 2 * bleedOffset);
        }
        
        // Draw cut lines (red)
        if (cutLineOffset < size / 2) {
            ctx.strokeStyle = cutLineColor;
            ctx.globalAlpha = 0.8;
            ctx.strokeRect(cutLineOffset, cutLineOffset, size - 2 * cutLineOffset, size - 2 * cutLineOffset);
        }
        
        // Draw safe zone (innermost - blue)
        if (safeZoneOffset < size / 2) {
            ctx.strokeStyle = safeZoneColor;
            ctx.globalAlpha = 0.7;
            ctx.strokeRect(safeZoneOffset, safeZoneOffset, size - 2 * safeZoneOffset, size - 2 * safeZoneOffset);
        }
        
        // Draw center crosshairs for alignment
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = '#888888';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        
        // Horizontal center line
        ctx.beginPath();
        ctx.moveTo(0, size / 2);
        ctx.lineTo(size, size / 2);
        ctx.stroke();
        
        // Vertical center line
        ctx.beginPath();
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(size / 2, size);
        ctx.stroke();
        
        ctx.restore();
    }
    
    previewPDF() {
        const modal = document.getElementById('previewModal');
        const previewCanvas = document.getElementById('previewCanvas');
        const previewMode = document.getElementById('previewMode');
        const previewSize = document.getElementById('previewSize');
        const previewGuides = document.getElementById('previewGuides');
        
        // Update preview info
        const isSingleMode = this.currentMode === 'single';
        previewMode.textContent = `Mode: ${isSingleMode ? 'Single Badge' : 'A4 Grid (12 Badges)'}`;
        previewSize.textContent = isSingleMode ? 'Size: 66×66mm' : 'Size: A4 (210×297mm)';
        
        // Update guides info
        const showGuides = document.getElementById('showGuides').checked;
        const showGridGuides = document.getElementById('showGridGuides').checked;
        let guidesText = 'Guides: ';
        if (isSingleMode) {
            guidesText += showGuides ? 'Cut guides enabled' : 'No guides';
        } else {
            const guides = [];
            if (showGuides) guides.push('Cut guides');
            if (showGridGuides) guides.push('Grid guides');
            guidesText += guides.length > 0 ? guides.join(', ') : 'No guides';
        }
        previewGuides.textContent = guidesText;
        
        // Generate preview
        if (isSingleMode) {
            this.generateSinglePreview(previewCanvas);
        } else {
            this.generateGridPreview(previewCanvas);
        }
        
        // Show modal
        modal.classList.remove('hidden');
    }
    
    generateSinglePreview(canvas) {
        if (!this.currentImage) return;

        const ctx = canvas.getContext('2d');
        const showGuides = document.getElementById('showGuides').checked;

        // Set canvas size for preview (66x66mm scaled down for better display)
        const scaleFactor = 0.4; // Scale down for better preview display
        const previewSize = Math.round(779 * scaleFactor); // 66mm at 300 DPI scaled down
        canvas.width = previewSize;
        canvas.height = previewSize;

        // Clear canvas
        ctx.clearRect(0, 0, previewSize, previewSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, previewSize, previewSize);

        // Get current adjustments and margin
        const adjustments = this.getCurrentAdjustments();
        const userMarginMm = parseFloat(document.getElementById('badgeMargin').value);

        // Calculate dimensions in preview scale (66mm = previewSize)
        const scale = previewSize / 66; // 66mm badge size
        const userMarginPixels = userMarginMm * scale;
        const imageSizePixels = previewSize - (2 * userMarginPixels);

        // Get crop values from controls (use single mode controls for single mode)
        const cropTop = parseFloat(document.getElementById('singleCropTop')?.value || 0);
        const cropBottom = parseFloat(document.getElementById('singleCropBottom')?.value || 0);
        const cropLeft = parseFloat(document.getElementById('singleCropLeft')?.value || 0);
        const cropRight = parseFloat(document.getElementById('singleCropRight')?.value || 0);

        console.log('🎬 Single Preview - Using crop values:', { cropTop, cropBottom, cropLeft, cropRight });

        // Calculate source crop coordinates first (independent of fit mode)
        const originalWidth = this.currentImage.width;
        const originalHeight = this.currentImage.height;
        const sourceCropLeft = (cropLeft / 100) * originalWidth;
        const sourceCropTop = (cropTop / 100) * originalHeight;
        const sourceCropWidth = originalWidth - sourceCropLeft - (cropRight / 100) * originalWidth;
        const sourceCropHeight = originalHeight - sourceCropTop - (cropBottom / 100) * originalHeight;

        // Use ORIGINAL dimensions for scaling calculations to prevent zoom-in effect
        // Scale to fill image area completely using ORIGINAL dimensions
        const imageScale = Math.max(imageSizePixels / originalWidth, imageSizePixels / originalHeight);
        const scaledWidth = sourceCropWidth * imageScale;
        const scaledHeight = sourceCropHeight * imageScale;

        // Position to fill image area with no gaps
        const imageOffsetX = userMarginPixels - (scaledWidth - imageSizePixels) / 2;
        const imageOffsetY = userMarginPixels - (scaledHeight - imageSizePixels) / 2;
        
        // Apply corner radius clipping
        ctx.save();
        ctx.beginPath();
        const previewCornerRadius = adjustments.cornerRadius * (imageSizePixels / 150);
        ctx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, previewCornerRadius);
        ctx.clip();

        // Apply adjustments if needed (same logic as PDF generation)
        if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) {
            // Create temporary canvas for adjustments - use cropped portion only
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = sourceCropWidth;
            tempCanvas.height = sourceCropHeight;

            // Draw cropped portion to temp canvas
            tempCtx.drawImage(this.currentImage,
                sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                0, 0, sourceCropWidth, sourceCropHeight);

            const imageData = tempCtx.getImageData(0, 0, sourceCropWidth, sourceCropHeight);
            this.applyImageFilters(imageData, adjustments);
            tempCtx.putImageData(imageData, 0, 0);

            // Draw adjusted cropped image
            ctx.drawImage(tempCanvas, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
        } else {
            // No adjustments needed - draw cropped portion directly
            ctx.drawImage(this.currentImage,
                sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
        }

        ctx.restore();
        
        // Draw guides if enabled (same proportions as PDF)
        if (showGuides) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            // Design area (50mm) - centered
            const designSize = 50 * scale;
            const designOffset = (previewSize - designSize) / 2;
            ctx.strokeRect(designOffset, designOffset, designSize, designSize);
            
            // Die cut area (61mm) - centered
            const dieCutSize = 61 * scale;
            const dieCutOffset = (previewSize - dieCutSize) / 2;
            ctx.strokeRect(dieCutOffset, dieCutOffset, dieCutSize, dieCutSize);
            
            // Rotary cut area (66mm) - full badge
            ctx.strokeRect(0, 0, previewSize, previewSize);
        }
    }
    
    generateGridPreview(canvas) {
        const hasImages = this.gridSlots.some(slot => slot !== null);
        if (!hasImages) return;
        
        const ctx = canvas.getContext('2d');
        const showGuides = document.getElementById('gridShowGuides').checked;
        const showGridGuides = document.getElementById('showGridGuides').checked;
        const templateOpacity = document.getElementById('gridTemplateOpacity').value / 100;
        
        // Set canvas size for A4 preview (scaled down for better display)
        const scaleFactor = 0.5; // Increased scale factor for better visibility
        const previewWidth = Math.round(2480 * scaleFactor); // 210mm at 300 DPI scaled down
        const previewHeight = Math.round(3508 * scaleFactor); // 297mm at 300 DPI scaled down
        canvas.width = previewWidth;
        canvas.height = previewHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, previewWidth, previewHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, previewWidth, previewHeight);
        
        // Calculate badge size in preview (66mm scaled down)
        const badgeSizeMm = 66; // 66x66mm badges
        const scale = previewWidth / 210; // Scale from A4 width (210mm) - now uses scaled previewWidth
        const badgeSize = badgeSizeMm * scale;
        
        // Calculate grid layout - same as PDF generation
        const cols = 3;
        const rows = 4;
        const totalWidth = cols * badgeSize;
        const totalHeight = rows * badgeSize;
        
        // Position badges to fill the page without gaps - same as PDF
        const startX = (previewWidth - totalWidth) / 2;
        const startY = (previewHeight - totalHeight) / 2;
        
        // Get user-selected margin (use grid margin for grid mode)
        const marginElement = document.getElementById('gridBadgeMargin');
        const userMarginMm = parseFloat(marginElement.value);
        const userMarginPixels = userMarginMm * scale;
        
        // Draw badges
        for (let i = 0; i < 12; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = startX + (col * badgeSize);
            const y = startY + (row * badgeSize);
            
            const slotData = this.gridSlots[i];
            
            if (slotData) {
                // Calculate image area size based on user margin - same as PDF
                const imageSizePixels = badgeSize - (2 * userMarginPixels);
                
                // Calculate source crop coordinates first
                const transform = slotData.transform;
                const sourceCropLeft = (transform.cropLeft / 100) * slotData.image.width;
                const sourceCropTop = (transform.cropTop / 100) * slotData.image.height;
                const sourceCropWidth = slotData.image.width - sourceCropLeft - (transform.cropRight / 100) * slotData.image.width;
                const sourceCropHeight = slotData.image.height - sourceCropTop - (transform.cropBottom / 100) * slotData.image.height;
                
                // Use ORIGINAL dimensions for scaling calculations to prevent zoom-in effect
                const originalWidth = slotData.image.width;
                const originalHeight = slotData.image.height;

                // Apply user scale and fine zoom
                const userScale = transform.scale / 100;
                const fineZoomScale = transform.fineZoom / 100;
                const totalScale = userScale * fineZoomScale;
                
                let finalWidth, finalHeight, finalOffsetX, finalOffsetY;
                
                switch (transform.fitMode) {
                    case 'contain':
                        // Fit entire image within image area (no cropping)
                        const scaleToFit = Math.min(imageSizePixels / originalWidth, imageSizePixels / originalHeight) * totalScale;
                        finalWidth = sourceCropWidth * scaleToFit;
                        finalHeight = sourceCropHeight * scaleToFit;
                        finalOffsetX = x + userMarginPixels + (imageSizePixels - finalWidth) / 2;
                        finalOffsetY = y + userMarginPixels + (imageSizePixels - finalHeight) / 2;
                        break;
                        
                    case 'fill':
                        // Stretch image to fill image area (may distort)
                        const fillScale = imageSizePixels / originalWidth * totalScale;
                        finalWidth = sourceCropWidth * fillScale;
                        finalHeight = sourceCropHeight * fillScale;
                        finalOffsetX = x + userMarginPixels + (imageSizePixels - finalWidth) / 2;
                        finalOffsetY = y + userMarginPixels + (imageSizePixels - finalHeight) / 2;
                        break;
                        
                    case 'cover':
                    default:
                        // Fill image area completely (crop image to fit bounds)
                        const scaleToFill = Math.max(imageSizePixels / originalWidth, imageSizePixels / originalHeight) * totalScale;
                        finalWidth = sourceCropWidth * scaleToFill;
                        finalHeight = sourceCropHeight * scaleToFill;
                        finalOffsetX = x + userMarginPixels + (imageSizePixels - finalWidth) / 2;
                        finalOffsetY = y + userMarginPixels + (imageSizePixels - finalHeight) / 2;
                        break;
                }
                
                // Apply user position offsets to final position
                finalOffsetX += (transform.offsetX / 100) * imageSizePixels;
                finalOffsetY += (transform.offsetY / 100) * imageSizePixels;
                
                // Apply grid-level adjustments (same as grid display)
                const gridAdjustments = this.getCurrentAdjustments(); // This gets grid adjustments in grid mode
                if (gridAdjustments.brightness !== 0 || gridAdjustments.contrast !== 0 || gridAdjustments.saturation !== 0) {
                    // Create temporary canvas for adjustments
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = finalWidth;
                    tempCanvas.height = finalHeight;
                    
                    // Draw cropped portion to temp canvas
                    tempCtx.drawImage(slotData.image, 
                        sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                        0, 0, finalWidth, finalHeight);
                    
                    const imageData = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
                    this.applyImageFilters(imageData, gridAdjustments);
                    tempCtx.putImageData(imageData, 0, 0);

                    // Apply corner radius, rotation, and flip transformations
                    ctx.save();
                    ctx.beginPath();
                    const cornerRadius = gridAdjustments.cornerRadius * (imageSizePixels / 150);
                    ctx.roundRect(x + userMarginPixels, y + userMarginPixels, imageSizePixels, imageSizePixels, cornerRadius);
                    ctx.clip();
                    
                    // Draw background if image is zoomed out (AFTER clip is applied)
                    if (totalScale < 1.0) {
                        this.drawBackgroundPDF(ctx, imageSizePixels, slotData.image, transform, x + userMarginPixels, y + userMarginPixels);
                    }
                    
                    // Apply rotation
                    if (transform.rotation !== 0) {
                        const centerX = x + userMarginPixels + imageSizePixels / 2;
                        const centerY = y + userMarginPixels + imageSizePixels / 2;
                        ctx.translate(centerX, centerY);
                        ctx.rotate((transform.rotation * Math.PI) / 180);
                        ctx.translate(-centerX, -centerY);
                    }
                    
                    // Apply flip transformations
                    if (transform.flipHorizontal || transform.flipVertical) {
                        ctx.save();
                        if (transform.flipHorizontal) {
                            ctx.scale(-1, 1);
                            finalOffsetX = -(finalOffsetX + finalWidth);
                        }
                        if (transform.flipVertical) {
                            ctx.scale(1, -1);
                            finalOffsetY = -(finalOffsetY + finalHeight);
                        }
                    }

                    ctx.drawImage(tempCanvas, finalOffsetX, finalOffsetY, finalWidth, finalHeight);
                    
                    // Restore flip transformations
                    if (transform.flipHorizontal || transform.flipVertical) {
                        ctx.restore();
                    }
                    
                    ctx.restore();
                } else {
                    // No adjustments needed - draw directly to image area with transformations
                    ctx.save();
                    ctx.beginPath();
                    const cornerRadius = gridAdjustments.cornerRadius * (imageSizePixels / 150);
                    ctx.roundRect(x + userMarginPixels, y + userMarginPixels, imageSizePixels, imageSizePixels, cornerRadius);
                    ctx.clip();
                    
                    // Draw background if image is zoomed out (AFTER clip is applied)
                    if (totalScale < 1.0) {
                        this.drawBackgroundPDF(ctx, imageSizePixels, slotData.image, transform, x + userMarginPixels, y + userMarginPixels);
                    }
                    
                    // Apply rotation
                    if (transform.rotation !== 0) {
                        const centerX = x + userMarginPixels + imageSizePixels / 2;
                        const centerY = y + userMarginPixels + imageSizePixels / 2;
                        ctx.translate(centerX, centerY);
                        ctx.rotate((transform.rotation * Math.PI) / 180);
                        ctx.translate(-centerX, -centerY);
                    }
                    
                    // Apply flip transformations
                    if (transform.flipHorizontal || transform.flipVertical) {
                        ctx.save();
                        if (transform.flipHorizontal) {
                            ctx.scale(-1, 1);
                            finalOffsetX = -(finalOffsetX + finalWidth);
                        }
                        if (transform.flipVertical) {
                            ctx.scale(1, -1);
                            finalOffsetY = -(finalOffsetY + finalHeight);
                        }
                    }

                    // Draw cropped portion directly
                    ctx.drawImage(slotData.image,
                        sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                        finalOffsetX, finalOffsetY, finalWidth, finalHeight);
                    
                    // Restore flip transformations
                    if (transform.flipHorizontal || transform.flipVertical) {
                        ctx.restore();
                    }
                    
                    ctx.restore();
                }
                
                // Draw cut guides if enabled (same proportions as PDF)
                if (showGuides) {
                    ctx.strokeStyle = `rgba(0, 0, 0, ${templateOpacity})`;
                    ctx.lineWidth = 1;
                    
                    // Design area (50mm) - centered
                    const designSize = 50 * scale;
                    const designOffset = (badgeSize - designSize) / 2;
                    ctx.strokeRect(x + designOffset, y + designOffset, designSize, designSize);
                    
                    // Die cut area (61mm) - centered
                    const dieCutSize = 61 * scale;
                    const dieCutOffset = (badgeSize - dieCutSize) / 2;
                    ctx.strokeRect(x + dieCutOffset, y + dieCutOffset, dieCutSize, dieCutSize);
                    
                    // Rotary cut area (66mm) - full badge
                    ctx.strokeRect(x, y, badgeSize, badgeSize);
                }
            } else if (showGuides) {
                // Draw empty slot guides
                ctx.strokeStyle = `rgba(200, 200, 200, ${templateOpacity})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, badgeSize, badgeSize);
            }
            
            // Draw grid guides if enabled
            if (showGridGuides) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, badgeSize, badgeSize);
            }
        }
    }
    
    closePreviewModal() {
        document.getElementById('previewModal').classList.add('hidden');
    }
    
    printPreview() {
        const previewCanvas = document.getElementById('previewCanvas');
        if (!previewCanvas) return;
        
        // Get canvas data as image
        const canvasDataURL = previewCanvas.toDataURL('image/png', 1.0);
        
        // Create a hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        document.body.appendChild(iframe);
        
        // Determine page size and orientation based on current mode
        const isSingleMode = this.currentMode === 'single';
        const pageSize = isSingleMode ? '66mm 66mm' : '210mm 297mm';
        
        // Create print HTML
        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>MagniStyle - Badge Template Print</title>
                <style>
                    @page {
                        size: ${pageSize};
                        margin: 0;
                    }
                    .print-logo {
                        position: absolute;
                        top: 5mm;
                        right: 5mm;
                        height: 15mm;
                        width: auto;
                        opacity: 0.7;
                    }
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                    }
                    img {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                        display: block;
                    }
                </style>
            </head>
            <body>
                <div style="width: 100%; height: 100%; position: relative;">
                    <img src="${canvasDataURL}" alt="Badge Template" style="width: 100%; height: 100%; object-fit: contain;">
                    <img src="MagniStyle.svg" class="print-logo" alt="MagniStyle Logo">
                </div>
            </body>
            </html>
        `;
        
        // Write content to iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printHTML);
        iframeDoc.close();
        
        // Wait for content to load, then print
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow.print();
                
                // Clean up iframe after printing
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 100);
        };
    }
    
    updateValueDisplays() {
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            const display = slider.parentNode.querySelector('.value-display');
            if (display) {
                const updateDisplay = () => {
                    let value = slider.value;
                    if (slider.id === 'templateOpacity') {
                        value += '%';
                    } else if (slider.id === 'cornerRadius') {
                        value += 'px';
                    } else if (slider.id === 'badgeMargin') {
                        value += 'mm';
                    }
                    display.textContent = value;
                };
                updateDisplay();
                slider.addEventListener('input', updateDisplay);
            }
        });
    }
    
    // File handling methods
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleSingleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            this.loadSingleImage(files[0]);
        }
    }
    
    handleSingleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.loadSingleImage(file);
        }
    }
    
    handleGridDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.loadGridImages(files);
    }
    
    handleGridFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        this.loadGridImages(files);
    }
    
    handleSlotDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleSlotDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleSlotDragStart(e, slotIndex) {
        if (!this.gridSlots[slotIndex]) {
            e.preventDefault();
            return;
        }
        
        this.draggedSlotIndex = slotIndex;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', slotIndex.toString());
        
        // Add visual feedback
        e.currentTarget.style.opacity = '0.5';
    }
    
    handleSlotDragEnd(e) {
        e.currentTarget.style.opacity = '1';
        this.draggedSlotIndex = null;
    }
    
    handleSlotDrop(e, slotIndex) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        // Check if this is a file drop or slot reordering
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        
        if (files.length > 0) {
            // File drop - load image to slot
            this.loadImageToSlot(files[0], slotIndex);
        } else if (this.draggedSlotIndex !== null && this.draggedSlotIndex !== slotIndex) {
            // Slot reordering - swap slots
            this.swapSlots(this.draggedSlotIndex, slotIndex);
        }
    }
    
    swapSlots(fromIndex, toIndex) {
        // Swap the slot data
        const temp = this.gridSlots[fromIndex];
        this.gridSlots[fromIndex] = this.gridSlots[toIndex];
        this.gridSlots[toIndex] = temp;
        
        // Update displays
        this.updateSlotDisplay(fromIndex);
        this.updateSlotDisplay(toIndex);
        
        // Clear selection to avoid confusion
        this.clearSelection();
        this.updateUI();
    }
    
    // Image loading methods
    loadSingleImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.originalImageData = null;
                this.cropData = null;
                this.resetImageAdjustments();
                this.drawMainCanvas();
                this.drawTemplate();
                this.updateUI();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    loadGridImages(files) {
        let currentSlotIndex = 0;
        
        files.forEach((file, index) => {
            // Find next empty slot starting from current position
            while (currentSlotIndex < 12 && this.gridSlots[currentSlotIndex] !== null) {
                currentSlotIndex++;
            }
            
            if (currentSlotIndex < 12) {
                this.loadImageToSlot(file, currentSlotIndex);
                currentSlotIndex++; // Move to next slot for next image
            }
        });
    }
    
    loadImageToSlot(file, slotIndex) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas for this slot
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size
                const size = 150; // Display size
                canvas.width = size;
                canvas.height = size;
                
                // Draw image to fill canvas with default corner radius (crop if necessary)
                this.drawImageToCanvas(img, ctx, size, size, 8, 'fill');
                
                // Store slot data
                this.gridSlots[slotIndex] = {
                    image: img,
                    canvas: canvas,
                    originalData: ctx.getImageData(0, 0, size, size),
                    adjustments: { brightness: 0, contrast: 0, saturation: 0, cornerRadius: 8 },
                    transform: {
                        scale: 100, 
                        fitMode: 'cover', 
                        offsetX: 0, 
                        offsetY: 0,
                        rotation: 0,
                        flipHorizontal: false,
                        flipVertical: false,
                        cropTop: 0,
                        cropBottom: 0,
                        cropLeft: 0,
                        cropRight: 0,
                        fineZoom: 100,
                        backgroundMode: 'color', // 'color' or 'blur'
                        backgroundColor: '#ffffff',
                        backgroundBlur: 5
                    }
                };
                
                console.log('Image loaded to slot', slotIndex, 'gridSlots now:', this.gridSlots.map((slot, i) => slot ? `slot${i}:image` : `slot${i}:null`));
                
                // Apply initial corner radius
                this.applyAdjustmentsToSlot(slotIndex, this.gridSlots[slotIndex].adjustments);
                
                // Update slot display
                this.updateSlotDisplay(slotIndex);
                this.updateUI();
                this.updateImagePreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    drawImageToCanvas(img, ctx, width, height, cornerRadius = 8, fillMode = 'fit') {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        let scale, scaledWidth, scaledHeight, offsetX, offsetY;

        if (fillMode === 'fill') {
            // Fill entire canvas maintaining aspect ratio (crop if necessary)
            scale = Math.max(width / img.width, height / img.height);
            scaledWidth = img.width * scale;
            scaledHeight = img.height * scale;
            offsetX = (width - scaledWidth) / 2;
            offsetY = (height - scaledHeight) / 2;
        } else {
            // Fit within canvas (maintain aspect ratio) - for display
            scale = Math.min(width / img.width, height / img.height);
            scaledWidth = img.width * scale;
            scaledHeight = img.height * scale;
            offsetX = (width - scaledWidth) / 2;
            offsetY = (height - scaledHeight) / 2;
        }

        // Create rounded rectangle path
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, cornerRadius);
        ctx.clip();

        // Draw image within clipped area - this will crop the image properly
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        ctx.restore();
    }
    
    updateSlotDisplay(slotIndex) {
        const slot = document.querySelector(`[data-slot-index="${slotIndex}"]`);
        const slotData = this.gridSlots[slotIndex];
        
        if (slotData) {
            slot.classList.remove('empty');
            slot.draggable = true; // Enable dragging when slot has content
            slot.title = 'Click to select, Ctrl+Click to multi-select';
            
            // Remove existing canvas if any
            const existingCanvas = slot.querySelector('canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
            
            // Redraw canvas with new scaling
            this.redrawSlotCanvas(slotIndex);
            
            // Add new canvas
            slot.appendChild(slotData.canvas);
        } else {
            slot.classList.add('empty');
            slot.draggable = false; // Disable dragging when slot is empty
            slot.title = 'Click to upload image';
            const existingCanvas = slot.querySelector('canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
        }
    }
    
    // Grid management methods
    findNextEmptySlot() {
        return this.gridSlots.findIndex(slot => slot === null);
    }
    
    getFirstImageSlot() {
        return this.gridSlots.find(slot => slot !== null);
    }
    
    handleSlotClick(slotIndex, event) {
        // Prevent event bubbling to avoid conflicts with other handlers
        event.stopPropagation();
        event.preventDefault();
        
        const slot = document.querySelector(`[data-slot-index="${slotIndex}"]`);
        const hasImage = this.gridSlots[slotIndex] !== null;
        
        if (hasImage) {
            // If slot has image, handle selection
            this.toggleSlotSelection(slotIndex, event);
        } else {
            // If slot is empty, trigger file upload
            this.uploadToSlot(slotIndex);
        }
    }
    
    toggleSlotSelection(slotIndex, event) {
        const slot = document.querySelector(`[data-slot-index="${slotIndex}"]`);
        
        if (event.ctrlKey || event.metaKey) {
            // Multi-select
            if (this.selectedSlots.has(slotIndex)) {
                this.selectedSlots.delete(slotIndex);
                slot.classList.remove('selected');
            } else {
                this.selectedSlots.add(slotIndex);
                slot.classList.add('selected');
            }
        } else {
            // Single select
            this.clearSelection();
            this.selectedSlots.add(slotIndex);
            slot.classList.add('selected');
        }
        
        // Update current selected slot for individual controls
        this.currentSelectedSlot = slotIndex;
        this.updateTransformControls();
        
        this.updateUI();
        this.updateImagePreview();
    }
    
    uploadToSlot(slotIndex) {
        // Create a temporary file input for this specific slot
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false;
        
        input.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.loadImageToSlot(files[0], slotIndex);
            }
        });
        
        // Trigger file dialog
        input.click();
    }
    
    clearSelection() {
        this.selectedSlots.clear();
        this.currentSelectedSlot = null; // Clear the current selected slot
        document.querySelectorAll('.grid-slot.selected').forEach(slot => {
            slot.classList.remove('selected');
        });
    }
    
    selectAllSlots() {
        // Check if all slots are already selected
        const allSelected = this.selectedSlots.size === 12;
        
        if (allSelected) {
            // If all are selected, deselect all
            this.clearSelection();
        } else {
            // Select all slots (both filled and empty)
            for (let i = 0; i < 12; i++) {
                this.selectedSlots.add(i);
                const slot = document.querySelector(`[data-slot-index="${i}"]`);
                if (slot) {
                    slot.classList.add('selected');
                }
            }
        }
        this.updateUI();
    }
    
    deselectAllSlots() {
        this.clearSelection();
        this.updateUI();
    }
    
    removeSlotImage(slotIndex) {
        this.gridSlots[slotIndex] = null;
        this.selectedSlots.delete(slotIndex);
        this.updateSlotDisplay(slotIndex);
        this.updateUI();
    }
    
    fillEmptySlots() {
        // Use selected image if available, otherwise use first image
        let sourceImage = null;
        
        if (this.selectedSlots.size > 0) {
            // Find first selected slot that has an image
            for (const slotIndex of this.selectedSlots) {
                if (this.gridSlots[slotIndex]) {
                    sourceImage = this.gridSlots[slotIndex];
                    break;
                }
            }
        }
        
        // Fallback to first image if no selected image found
        if (!sourceImage) {
            sourceImage = this.getFirstImageSlot();
        }
        
        if (!sourceImage) return;
        
        for (let i = 0; i < this.gridSlots.length; i++) {
            if (!this.gridSlots[i]) {
                // Clone the source image data
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = sourceImage.canvas.width;
                canvas.height = sourceImage.canvas.height;
                
                // Copy the canvas with corner radius
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(0, 0, canvas.width, canvas.height, sourceImage.adjustments.cornerRadius);
                ctx.clip();
                ctx.drawImage(sourceImage.canvas, 0, 0);
                ctx.restore();
                
                this.gridSlots[i] = {
                    image: sourceImage.image,
                    canvas: canvas,
                    originalData: new ImageData(
                        new Uint8ClampedArray(sourceImage.originalData.data),
                        sourceImage.originalData.width,
                        sourceImage.originalData.height
                    ),
                    adjustments: { ...sourceImage.adjustments },
                    transform: { ...sourceImage.transform }
                };
                
                this.updateSlotDisplay(i);
            }
        }
        
        this.updateUI();
    }
    
    clearAllSlots() {
        if (confirm('Are you sure you want to clear all images?')) {
            this.gridSlots.fill(null);
            this.clearSelection();
            
            for (let i = 0; i < 12; i++) {
                this.updateSlotDisplay(i);
            }
            
            this.updateUI();
        }
    }
    
    // Image adjustment methods
    onAdjustmentChange() {
        if (this.currentMode === 'single') {
            this.applyImageAdjustments();
            this.drawTemplate();
        } else {
            // In grid mode, apply adjustments in real-time to selected slots
            if (this.selectedSlots.size > 0) {
                const adjustments = this.getCurrentAdjustments();
                this.selectedSlots.forEach(slotIndex => {
                    this.applyAdjustmentsToSlot(slotIndex, adjustments);
                });
            }
            // Update the preview panel to show current adjustments
            this.updateImagePreview();
        }
    }

    onMarginChange() {
        const isSingleMode = this.currentMode === 'single';
        const marginElement = isSingleMode ? document.getElementById('badgeMargin') : document.getElementById('gridBadgeMargin');
        const marginValue = marginElement.value;
        const imageSize = 66 - (2 * parseFloat(marginValue)); // 66mm badge - (2 * margin)

        // Update preview to show margin changes - this will mainly affect PDF generation
        console.log(`Badge margin: ${marginValue}mm | Image area: ${imageSize.toFixed(1)}mm × ${imageSize.toFixed(1)}mm`);

        // Optionally update UI to show current image area size
        const exportSize = document.getElementById('exportSize');
        if (exportSize) {
            if (isSingleMode) {
                exportSize.textContent = `Size: ${imageSize.toFixed(1)}×${imageSize.toFixed(1)}mm (with margin)`;
            } else {
                exportSize.textContent = 'Size: A4 (210×297mm)';
            }
        }

        this.onAdjustmentChange();
        
        // If in grid mode, redraw all slots to update grid guides with new margin
        if (!isSingleMode) {
            for (let i = 0; i < this.gridSlots.length; i++) {
                if (this.gridSlots[i]) {
                    this.redrawSlotCanvas(i);
                }
            }
            // Update preview as well
            this.updateImagePreview();
        }
    }
    
    previewAdjustmentsOnSlot(slotIndex, adjustments) {
        const slotData = this.gridSlots[slotIndex];
        if (!slotData) return;
        
        // Create a temporary preview without saving adjustments
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = slotData.canvas.width;
        tempCanvas.height = slotData.canvas.height;
        
        // Apply original image data
        const imageData = new ImageData(
            new Uint8ClampedArray(slotData.originalData.data),
            slotData.originalData.width,
            slotData.originalData.height
        );
        
        // Apply color filters
        this.applyImageFilters(imageData, adjustments);
        tempCtx.putImageData(imageData, 0, 0);
        
        // Apply corner radius and draw to slot canvas
        const ctx = slotData.canvas.getContext('2d');
        ctx.clearRect(0, 0, slotData.canvas.width, slotData.canvas.height);
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, slotData.canvas.width, slotData.canvas.height, adjustments.cornerRadius);
        ctx.clip();
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    }
    
    applyToSelected() {
        if (this.selectedSlots.size === 0) return;
        
        const adjustments = this.getCurrentAdjustments();
        
        this.selectedSlots.forEach(slotIndex => {
            this.applyAdjustmentsToSlot(slotIndex, adjustments);
        });
        
        console.log(`Applied adjustments to ${this.selectedSlots.size} selected slots`);
    }
    
    applyToAll() {
        const adjustments = this.getCurrentAdjustments();
        
        this.gridSlots.forEach((slot, index) => {
            if (slot) {
                this.applyAdjustmentsToSlot(index, adjustments);
            }
        });
    }
    
    getCurrentAdjustments() {
        const isSingleMode = this.currentMode === 'single';
        
        if (isSingleMode) {
            return {
                brightness: parseInt(document.getElementById('brightness').value),
                contrast: parseInt(document.getElementById('contrast').value),
                saturation: parseInt(document.getElementById('saturation').value),
                cornerRadius: parseInt(document.getElementById('cornerRadius').value)
            };
        } else {
            return {
                brightness: parseInt(document.getElementById('gridBrightness').value),
                contrast: parseInt(document.getElementById('gridContrast').value),
                saturation: parseInt(document.getElementById('gridSaturation').value),
                cornerRadius: parseInt(document.getElementById('gridCornerRadius').value)
            };
        }
    }
    
    resetAdjustments() {
        document.getElementById('brightness').value = 0;
        document.getElementById('contrast').value = 0;
        document.getElementById('saturation').value = 0;
        document.getElementById('cornerRadius').value = 8;
        this.updateValueDisplays();
        
        if (this.currentMode === 'single') {
            this.resetImageAdjustments();
            this.applyImageAdjustments();
            this.drawTemplate();
        }
    }
    
    resetGridAdjustments() {
        // Reset grid mode controls
        document.getElementById('gridBrightness').value = 0;
        document.getElementById('gridContrast').value = 0;
        document.getElementById('gridSaturation').value = 0;
        document.getElementById('gridCornerRadius').value = 8;
        document.getElementById('gridBadgeMargin').value = 8;
        
        // Update value displays
        this.updateValueDisplays();
        
        // Apply reset to selected slots
        if (this.selectedSlots.size > 0) {
            const resetAdjustments = { brightness: 0, contrast: 0, saturation: 0, cornerRadius: 8 };
            this.selectedSlots.forEach(slotIndex => {
                this.applyAdjustmentsToSlot(slotIndex, resetAdjustments);
            });
        }
        
        console.log('Grid adjustments reset');
    }
    
    applyAdjustmentsToSlot(slotIndex, adjustments) {
        const slotData = this.gridSlots[slotIndex];
        if (!slotData) return;
        
        // Store adjustments
        slotData.adjustments = { ...adjustments };
        
        // Create temporary canvas for image processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = slotData.canvas.width;
        tempCanvas.height = slotData.canvas.height;
        
        // Apply original image data
        const imageData = new ImageData(
            new Uint8ClampedArray(slotData.originalData.data),
            slotData.originalData.width,
            slotData.originalData.height
        );
        
        // Apply color filters
        this.applyImageFilters(imageData, adjustments);
        tempCtx.putImageData(imageData, 0, 0);
        
        // Apply corner radius by redrawing with clipping
        const ctx = slotData.canvas.getContext('2d');
        ctx.clearRect(0, 0, slotData.canvas.width, slotData.canvas.height);
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, slotData.canvas.width, slotData.canvas.height, adjustments.cornerRadius);
        ctx.clip();
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
        
        // Update display
        this.updateSlotDisplay(slotIndex);
    }
    
    applyImageFilters(imageData, adjustments) {
        const data = imageData.data;
        const { brightness, contrast, saturation } = adjustments;
        
        for (let i = 0; i < data.length; i += 4) {
            // Brightness adjustment
            data[i] = Math.max(0, Math.min(255, data[i] + brightness));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness));
            
            // Contrast adjustment
            const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            data[i] = Math.max(0, Math.min(255, contrastFactor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, contrastFactor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, contrastFactor * (data[i + 2] - 128) + 128));
            
            // Saturation adjustment
            if (saturation !== 0) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const satFactor = 1 + saturation / 100;
                
                data[i] = Math.max(0, Math.min(255, gray + satFactor * (data[i] - gray)));
                data[i + 1] = Math.max(0, Math.min(255, gray + satFactor * (data[i + 1] - gray)));
                data[i + 2] = Math.max(0, Math.min(255, gray + satFactor * (data[i + 2] - gray)));
            }
        }
    }
    
    // Single mode methods (existing functionality)
    drawMainCanvas() {
        if (!this.currentImage) return;

        // Get crop values from single mode controls
        const cropTop = parseFloat(document.getElementById('singleCropTop')?.value || 0);
        const cropBottom = parseFloat(document.getElementById('singleCropBottom')?.value || 0);
        const cropLeft = parseFloat(document.getElementById('singleCropLeft')?.value || 0);
        const cropRight = parseFloat(document.getElementById('singleCropRight')?.value || 0);

        // Calculate source crop coordinates
        const originalWidth = this.currentImage.width;
        const originalHeight = this.currentImage.height;
        const sourceCropLeft = (cropLeft / 100) * originalWidth;
        const sourceCropTop = (cropTop / 100) * originalHeight;
        const sourceCropWidth = originalWidth - sourceCropLeft - (cropRight / 100) * originalWidth;
        const sourceCropHeight = originalHeight - sourceCropTop - (cropBottom / 100) * originalHeight;

        // Use cropped dimensions for aspect ratio calculations
        const croppedAspect = sourceCropWidth / sourceCropHeight;

        // Get container dimensions for responsive sizing
        const container = this.mainCanvas.parentElement;
        const containerRect = container.getBoundingClientRect();

        // Use responsive max dimensions based on screen size
        const isMobile = window.innerWidth <= 768;
        const maxWidth = isMobile ? Math.min(containerRect.width - 40, 400) : 600;
        const maxHeight = isMobile ? Math.min(containerRect.height - 40, 300) : 400;

        let canvasWidth, canvasHeight;
        if (croppedAspect > maxWidth / maxHeight) {
            canvasWidth = maxWidth;
            canvasHeight = maxWidth / croppedAspect;
        } else {
            canvasHeight = maxHeight;
            canvasWidth = maxHeight * croppedAspect;
        }

        this.mainCanvas.width = canvasWidth;
        this.mainCanvas.height = canvasHeight;

        // Clear canvas
        this.mainCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw the cropped portion of the image
        if (cropTop === 0 && cropBottom === 0 && cropLeft === 0 && cropRight === 0) {
            // No cropping - draw full image
            this.mainCtx.drawImage(this.currentImage, 0, 0, canvasWidth, canvasHeight);
            if (!this.originalImageData) {
                this.originalImageData = this.mainCtx.getImageData(0, 0, canvasWidth, canvasHeight);
            }
        } else {
            // Draw cropped portion
            this.mainCtx.drawImage(this.currentImage,
                sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                0, 0, canvasWidth, canvasHeight);
            // Reset original image data when crop changes
            this.originalImageData = this.mainCtx.getImageData(0, 0, canvasWidth, canvasHeight);
        }

        this.applyImageAdjustments();
    }
    
    applyImageAdjustments() {
        if (!this.originalImageData) return;
        
        const brightness = parseInt(document.getElementById('brightness').value);
        const contrast = parseInt(document.getElementById('contrast').value);
        const saturation = parseInt(document.getElementById('saturation').value);
        
        const imageData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            this.originalImageData.width,
            this.originalImageData.height
        );
        
        this.applyImageFilters(imageData, { brightness, contrast, saturation });
        this.mainCtx.putImageData(imageData, 0, 0);
    }
    
    resetImageAdjustments() {
        document.getElementById('brightness').value = 0;
        document.getElementById('contrast').value = 0;
        document.getElementById('saturation').value = 0;
        this.updateValueDisplays();
    }
    
    // Crop methods (existing functionality - simplified for brevity)
    enableCrop() {
        if (!this.currentImage) return;
        
        this.isCropping = true;
        document.getElementById('enableCrop').disabled = true;
        document.getElementById('applyCrop').disabled = false;
        
        const overlay = document.getElementById('cropOverlay');
        overlay.classList.remove('hidden');
        
        const canvasRect = this.mainCanvas.getBoundingClientRect();
        const cropBox = overlay.querySelector('.crop-box');
        
        const initialSize = Math.min(canvasRect.width, canvasRect.height) * 0.6;
        const left = (canvasRect.width - initialSize) / 2;
        const top = (canvasRect.height - initialSize) / 2;
        
        cropBox.style.left = left + 'px';
        cropBox.style.top = top + 'px';
        cropBox.style.width = initialSize + 'px';
        cropBox.style.height = initialSize + 'px';
        
        this.setupCropHandlers(cropBox);
    }
    
    setupCropHandlers(cropBox) {
        // Simplified crop handler setup - full implementation would be similar to original
        // For brevity, including basic functionality
        let isDragging = false;
        
        cropBox.addEventListener('mousedown', (e) => {
            if (e.target === cropBox) {
                isDragging = true;
                e.preventDefault();
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    applyCrop() {
        // Simplified crop application
        document.getElementById('cropOverlay').classList.add('hidden');
        this.isCropping = false;
        document.getElementById('enableCrop').disabled = false;
        document.getElementById('applyCrop').disabled = true;
        this.drawTemplate();
    }
    
    resetCrop() {
        if (this.currentImage) {
            this.drawMainCanvas();
            this.drawTemplate();
        }

        document.getElementById('cropOverlay').classList.add('hidden');
        this.isCropping = false;
        document.getElementById('enableCrop').disabled = false;
        document.getElementById('applyCrop').disabled = true;
    }

    onSingleCropChange() {
        // Update value displays for single mode crop controls
        const cropTop = parseInt(document.getElementById('singleCropTop').value) || 0;
        const cropBottom = parseInt(document.getElementById('singleCropBottom').value) || 0;
        const cropLeft = parseInt(document.getElementById('singleCropLeft').value) || 0;
        const cropRight = parseInt(document.getElementById('singleCropRight').value) || 0;

        // Update value displays
        const singleCropTopEl = document.getElementById('singleCropTop');
        const singleCropBottomEl = document.getElementById('singleCropBottom');
        const singleCropLeftEl = document.getElementById('singleCropLeft');
        const singleCropRightEl = document.getElementById('singleCropRight');

        if (singleCropTopEl && singleCropTopEl.nextElementSibling) singleCropTopEl.nextElementSibling.textContent = cropTop + '%';
        if (singleCropBottomEl && singleCropBottomEl.nextElementSibling) singleCropBottomEl.nextElementSibling.textContent = cropBottom + '%';
        if (singleCropLeftEl && singleCropLeftEl.nextElementSibling) singleCropLeftEl.nextElementSibling.textContent = cropLeft + '%';
        if (singleCropRightEl && singleCropRightEl.nextElementSibling) singleCropRightEl.nextElementSibling.textContent = cropRight + '%';

        console.log('🎬 Single mode crop values changed:', { cropTop, cropBottom, cropLeft, cropRight });

        // Redraw the main canvas with crop values
        if (this.currentImage) {
            this.drawMainCanvas();
            this.drawTemplate();
        }
    }

    resetSingleCrop() {
        // Reset all single mode crop values to 0
        document.getElementById('singleCropTop').value = 0;
        document.getElementById('singleCropBottom').value = 0;
        document.getElementById('singleCropLeft').value = 0;
        document.getElementById('singleCropRight').value = 0;

        // Update displays
        const displays = ['singleCropTop', 'singleCropBottom', 'singleCropLeft', 'singleCropRight'];
        displays.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.nextElementSibling) el.nextElementSibling.textContent = '0%';
        });

        // Redraw canvas
        if (this.currentImage) {
            this.drawMainCanvas();
            this.drawTemplate();
        }
    }
    
    // Template drawing methods
    drawTemplate() {
        if (this.currentMode === 'single') {
            this.drawSingleTemplate();
        } else {
            this.updateGridDisplay();
        }
    }
    
    updateUploadStats() {
        const filledSlots = this.gridSlots.filter(slot => slot !== null).length;
        const emptySlots = 12 - filledSlots;
        
        const filledSlotsElement = document.getElementById('filledSlots');
        const emptySlotsElement = document.getElementById('emptySlots');
        
        if (filledSlotsElement) {
            filledSlotsElement.textContent = filledSlots;
        }
        
        if (emptySlotsElement) {
            emptySlotsElement.textContent = emptySlots;
        }
    }
    
    drawSingleTemplate() {
        const canvas = this.templateCanvas;
        const ctx = this.templateCtx;
        
        if (!canvas || !ctx) {
            return; // Skip if template canvas doesn't exist
        }
        
        const showGuides = document.getElementById('showGuides').checked;
        const opacity = document.getElementById('templateOpacity').value / 100;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const previewSize = 400;
        canvas.width = previewSize;
        canvas.height = previewSize;
        
        const scale = previewSize / this.dimensions.rotary.width;
        
        if (this.currentImage && this.mainCanvas.width > 0) {
            const imageSize = this.dimensions.design.width * scale;
            const imageX = (previewSize - imageSize) / 2;
            const imageY = (previewSize - imageSize) / 2;
            
            ctx.drawImage(this.mainCanvas, imageX, imageY, imageSize, imageSize);
        }
        
        if (showGuides) {
            this.drawGuides(ctx, previewSize, scale, opacity);
        }
    }
    
    drawGuides(ctx, previewSize, scale, opacity) {
        ctx.globalAlpha = opacity;
        
        const centerX = previewSize / 2;
        const centerY = previewSize / 2;
        
        // Design area (red)
        const designSize = this.dimensions.design.width * scale;
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - designSize / 2, centerY - designSize / 2, designSize, designSize);
        
        // Badge area (orange)
        const badgeSize = this.dimensions.badge.width * scale;
        ctx.strokeStyle = '#d69e2e';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - badgeSize / 2, centerY - badgeSize / 2, badgeSize, badgeSize);
        
        // Die cut area (green)
        const dieCutSize = this.dimensions.dieCut.width * scale;
        ctx.strokeStyle = '#38a169';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - dieCutSize / 2, centerY - dieCutSize / 2, dieCutSize, dieCutSize);
        
        // Rotary cut area (blue)
        const rotarySize = this.dimensions.rotary.width * scale;
        ctx.strokeStyle = '#3182ce';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - rotarySize / 2, centerY - rotarySize / 2, rotarySize, rotarySize);
        
        ctx.globalAlpha = 1;
    }
    
    updateGridDisplay() {
        // Update the visual display of grid guides
        const showGuides = document.getElementById('showGridGuides').checked;
        const gridContainer = document.getElementById('a4Grid');
        
        if (showGuides) {
            gridContainer.classList.add('show-guides');
        } else {
            gridContainer.classList.remove('show-guides');
        }
    }
    
    updateTemplateOpacity() {
        this.drawTemplate();
    }
    
    // PDF generation methods
    async downloadPDF() {
        if (this.currentMode === 'single') {
            return this.downloadSinglePDF();
        } else {
            return this.downloadGridPDF();
        }
    }
    
    async downloadSinglePDF() {
        if (!this.currentImage) return;
        
        document.getElementById('loadingOverlay').classList.remove('hidden');
        
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                unit: 'mm',
                format: [66, 66],
                orientation: 'portrait'
            });
            
            // Create high-resolution canvas (300 DPI)
            const printCanvas = document.createElement('canvas');
            const printCtx = printCanvas.getContext('2d');
            
            printCanvas.width = this.dimensions.rotary.width;
            printCanvas.height = this.dimensions.rotary.height;
            
            // Use full badge size for image scaling
            const badgeSizePixels = this.dimensions.rotary.width; // 779 pixels for 66mm
            const offsetX = 0; // No offset - fill entire badge
            const offsetY = 0; // No offset - fill entire badge
            
            // Fill background
            printCtx.fillStyle = '#ffffff';
            printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
            
            if (this.currentImage && this.mainCanvas.width > 0) {
                // Get current adjustments
                const brightness = parseInt(document.getElementById('brightness').value);
                const contrast = parseInt(document.getElementById('contrast').value);
                const saturation = parseInt(document.getElementById('saturation').value);
                const cornerRadius = parseInt(document.getElementById('cornerRadius').value);
                
                // Get user-selected margin
                const userMarginMm = parseFloat(document.getElementById('badgeMargin').value);
                const userMarginPixels = userMarginMm * 11.811; // Convert mm to pixels at 300 DPI

                // Calculate image area size based on user margin
                const badgeSizePixels = this.dimensions.rotary.width; // 779 pixels for 66mm
                const imageSizePixels = badgeSizePixels - (2 * userMarginPixels); // Image area = badge - (2 * margin)

                // Get crop values from controls (use single mode controls for single mode)
                const cropTop = parseFloat(document.getElementById('singleCropTop')?.value || 0);
                const cropBottom = parseFloat(document.getElementById('singleCropBottom')?.value || 0);
                const cropLeft = parseFloat(document.getElementById('singleCropLeft')?.value || 0);
                const cropRight = parseFloat(document.getElementById('singleCropRight')?.value || 0);

                console.log('📄 Single PDF - Using crop values:', { cropTop, cropBottom, cropLeft, cropRight });

                // Calculate source crop coordinates first (independent of fit mode)
                const originalWidth = this.currentImage.width;
                const originalHeight = this.currentImage.height;
                const sourceCropLeft = (cropLeft / 100) * originalWidth;
                const sourceCropTop = (cropTop / 100) * originalHeight;
                const sourceCropWidth = originalWidth - sourceCropLeft - (cropRight / 100) * originalWidth;
                const sourceCropHeight = originalHeight - sourceCropTop - (cropBottom / 100) * originalHeight;

                // Use ORIGINAL dimensions for scaling calculations to prevent zoom-in effect
                // Scale to fill image area completely using ORIGINAL dimensions
                const scale = Math.max(imageSizePixels / originalWidth, imageSizePixels / originalHeight);
                const scaledWidth = sourceCropWidth * scale;
                const scaledHeight = sourceCropHeight * scale;
                // Position to fill image area with no gaps
                const imageOffsetX = userMarginPixels - (scaledWidth - imageSizePixels) / 2;
                const imageOffsetY = userMarginPixels - (scaledHeight - imageSizePixels) / 2;
                
                // Apply corner radius clipping
                printCtx.save();
                printCtx.beginPath();
                const printCornerRadius = cornerRadius * (imageSizePixels / 150);
                printCtx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, printCornerRadius);
                printCtx.clip();

                // Apply adjustments if needed
                if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
                    // Create temporary canvas for adjustments - use cropped portion only
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = sourceCropWidth;
                    tempCanvas.height = sourceCropHeight;

                    // Draw cropped portion to temp canvas
                    tempCtx.drawImage(this.currentImage,
                        sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                        0, 0, sourceCropWidth, sourceCropHeight);

                    const imageData = tempCtx.getImageData(0, 0, sourceCropWidth, sourceCropHeight);
                    this.applyImageFilters(imageData, { brightness, contrast, saturation });
                    tempCtx.putImageData(imageData, 0, 0);

                    // Draw adjusted cropped image
                    printCtx.drawImage(tempCanvas, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
                } else {
                    // No adjustments needed - draw cropped portion directly
                    printCtx.drawImage(this.currentImage,
                        sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                        imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
                }

                printCtx.restore();
            }
            
            const imageData = printCanvas.toDataURL('image/png', 1.0); // Use PNG for better quality
            pdf.addImage(imageData, 'PNG', 0, 0, 66, 66);
            
            // Add MagniStyle logo to PDF
            try {
                const logoImg = new Image();
                logoImg.onload = () => {
                    const logoCanvas = document.createElement('canvas');
                    const logoCtx = logoCanvas.getContext('2d');
                    logoCanvas.width = 20;
                    logoCanvas.height = 20;
                    logoCtx.drawImage(logoImg, 0, 0, 20, 20);
                    const logoData = logoCanvas.toDataURL('image/png');
                    pdf.addImage(logoData, 'PNG', 46, 46, 20, 20);
                };
                logoImg.src = 'MagniStyle.svg';
            } catch (logoError) {
                console.log('Logo not available for PDF');
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            pdf.save(`MagniStyle-badge-template-${timestamp}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    }
    
    async downloadGridPDF() {
        const hasImages = this.gridSlots.some(slot => slot !== null);
        if (!hasImages) return;
        
        document.getElementById('loadingOverlay').classList.remove('hidden');
        
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            });
            
            // A4 dimensions: 210x297mm
            const pageWidth = 210;
            const pageHeight = 297;
            const badgeSize = 66; // 66x66mm including margins
            
            // Calculate grid layout - ensure badges fit properly without gaps
            const cols = 3;
            const rows = 4;
            const spacing = 0; // No spacing between badges
            
            // Position badges to fill the page without gaps
            const totalWidth = cols * badgeSize;
            const totalHeight = rows * badgeSize;
            
            // Start from top-left with minimal margin
            const startX = (pageWidth - totalWidth) / 2;
            const startY = (pageHeight - totalHeight) / 2;
            
            // Create canvas for each badge at PDF resolution
            const badgeCanvas = document.createElement('canvas');
            const badgeCtx = badgeCanvas.getContext('2d');
            // Use PDF dimensions directly (66mm at 300 DPI = 779 pixels)
            badgeCanvas.width = this.dimensions.rotary.width;
            badgeCanvas.height = this.dimensions.rotary.height;
            
            const showGridGuides = document.getElementById('showGridGuides').checked;
            const showCutGuides = document.getElementById('gridShowGuides').checked;
            
            for (let i = 0; i < 12; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                const x = startX + (col * badgeSize);
                const y = startY + (row * badgeSize);
                
                const slotData = this.gridSlots[i];
                
                if (slotData) {
                    // Clear badge canvas
                    badgeCtx.fillStyle = '#ffffff';
                    badgeCtx.fillRect(0, 0, badgeCanvas.width, badgeCanvas.height);
                    
                    // Get user-selected margin (use grid margin for grid mode)
                    const marginElement = document.getElementById('gridBadgeMargin');
                    const userMarginMm = parseFloat(marginElement.value);
                    const userMarginPixels = userMarginMm * 11.811; // Convert mm to pixels at 300 DPI

                    // Calculate image area size based on user margin
                    const badgeSizePixels = this.dimensions.rotary.width; // 779 pixels for 66mm
                    const imageSizePixels = badgeSizePixels - (2 * userMarginPixels); // Image area = badge - (2 * margin)

                    const transform = slotData.transform;
                    
                    // Calculate source crop coordinates first
                    const sourceCropLeft = (transform.cropLeft / 100) * slotData.image.width;
                    const sourceCropTop = (transform.cropTop / 100) * slotData.image.height;
                    const sourceCropWidth = slotData.image.width - sourceCropLeft - (transform.cropRight / 100) * slotData.image.width;
                    const sourceCropHeight = slotData.image.height - sourceCropTop - (transform.cropBottom / 100) * slotData.image.height;
                    
                    // Use ORIGINAL dimensions for scaling calculations to prevent zoom-in effect
                    const originalWidth = slotData.image.width;
                    const originalHeight = slotData.image.height;

                    // Apply user scale and fine zoom (to match grid display)
                    const userScale = transform.scale / 100;
                    const fineZoomScale = transform.fineZoom / 100;
                    const totalScale = userScale * fineZoomScale;
                    
                    let scaledWidth, scaledHeight, offsetX, offsetY;
                    
                    switch (transform.fitMode) {
                        case 'contain':
                            // Fit entire image within image area (no cropping)
                            const scaleToFit = Math.min(imageSizePixels / originalWidth, imageSizePixels / originalHeight) * totalScale;
                            scaledWidth = sourceCropWidth * scaleToFit;
                            scaledHeight = sourceCropHeight * scaleToFit;
                            offsetX = userMarginPixels + (imageSizePixels - scaledWidth) / 2;
                            offsetY = userMarginPixels + (imageSizePixels - scaledHeight) / 2;
                            break;
                            
                        case 'fill':
                            // Stretch image to fill image area (may distort)
                            const fillScale = imageSizePixels / originalWidth * totalScale;
                            scaledWidth = sourceCropWidth * fillScale;
                            scaledHeight = sourceCropHeight * fillScale;
                            offsetX = userMarginPixels + (imageSizePixels - scaledWidth) / 2;
                            offsetY = userMarginPixels + (imageSizePixels - scaledHeight) / 2;
                            break;
                            
                        case 'cover':
                        default:
                            // Fill image area completely (crop image to fit bounds)
                            const scaleToFill = Math.max(imageSizePixels / originalWidth, imageSizePixels / originalHeight) * totalScale;
                            scaledWidth = sourceCropWidth * scaleToFill;
                            scaledHeight = sourceCropHeight * scaleToFill;
                            offsetX = userMarginPixels - (scaledWidth - imageSizePixels) / 2;
                            offsetY = userMarginPixels - (scaledHeight - imageSizePixels) / 2;
                            break;
                    }
                    
                    // Apply user position offsets
                    offsetX += (transform.offsetX / 100) * imageSizePixels;
                    offsetY += (transform.offsetY / 100) * imageSizePixels;
                    
                    // Apply grid-level adjustments (same as grid display)
                    const gridAdjustments = this.getCurrentAdjustments(); // This gets grid adjustments in grid mode
                    if (gridAdjustments.brightness !== 0 || gridAdjustments.contrast !== 0 || gridAdjustments.saturation !== 0) {
                        // Create temporary canvas for adjustments
                        const tempCanvas = document.createElement('canvas');
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCanvas.width = scaledWidth;
                        tempCanvas.height = scaledHeight;
                        
                        // Draw cropped portion to temp canvas
                        tempCtx.drawImage(slotData.image, 
                            sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                            0, 0, scaledWidth, scaledHeight);
                        
                        const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
                        this.applyImageFilters(imageData, gridAdjustments);
                        tempCtx.putImageData(imageData, 0, 0);
                        
                        // Apply corner radius, rotation, and flip transformations
                        badgeCtx.save();
                        badgeCtx.beginPath();
                        const cornerRadius = gridAdjustments.cornerRadius * (imageSizePixels / 150);
                        badgeCtx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, cornerRadius);
                        badgeCtx.clip();
                        
                        // Draw background if image is zoomed out (AFTER clip is applied)
                        if (totalScale < 1.0) {
                            this.drawBackgroundPDF(badgeCtx, imageSizePixels, slotData.image, transform, userMarginPixels);
                        }
                        
                        // Apply rotation
                        if (transform.rotation !== 0) {
                            const centerX = userMarginPixels + imageSizePixels / 2;
                            const centerY = userMarginPixels + imageSizePixels / 2;
                            badgeCtx.translate(centerX, centerY);
                            badgeCtx.rotate((transform.rotation * Math.PI) / 180);
                            badgeCtx.translate(-centerX, -centerY);
                        }
                        
                        // Apply flip transformations
                        if (transform.flipHorizontal || transform.flipVertical) {
                            badgeCtx.save();
                            if (transform.flipHorizontal) {
                                badgeCtx.scale(-1, 1);
                                offsetX = badgeCanvas.width - offsetX - scaledWidth;
                            }
                            if (transform.flipVertical) {
                                badgeCtx.scale(1, -1);
                                offsetY = badgeCanvas.height - offsetY - scaledHeight;
                            }
                        }
                        
                        badgeCtx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
                        
                        // Restore flip transformations
                        if (transform.flipHorizontal || transform.flipVertical) {
                            badgeCtx.restore();
                        }
                        
                        badgeCtx.restore();
                    } else {
                        // No adjustments needed - draw directly to image area with transformations
                        badgeCtx.save();
                        badgeCtx.beginPath();
                        const cornerRadius = gridAdjustments.cornerRadius * (imageSizePixels / 150);
                        badgeCtx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, cornerRadius);
                        badgeCtx.clip();
                        
                        // Draw background if image is zoomed out (AFTER clip is applied)
                        if (totalScale < 1.0) {
                            this.drawBackgroundPDF(badgeCtx, imageSizePixels, slotData.image, transform, userMarginPixels);
                        }
                        
                        // Apply rotation
                        if (transform.rotation !== 0) {
                            const centerX = userMarginPixels + imageSizePixels / 2;
                            const centerY = userMarginPixels + imageSizePixels / 2;
                            badgeCtx.translate(centerX, centerY);
                            badgeCtx.rotate((transform.rotation * Math.PI) / 180);
                            badgeCtx.translate(-centerX, -centerY);
                        }
                        
                        // Apply flip transformations
                        if (transform.flipHorizontal || transform.flipVertical) {
                            badgeCtx.save();
                            if (transform.flipHorizontal) {
                                badgeCtx.scale(-1, 1);
                                offsetX = badgeCanvas.width - offsetX - scaledWidth;
                            }
                            if (transform.flipVertical) {
                                badgeCtx.scale(1, -1);
                                offsetY = badgeCanvas.height - offsetY - scaledHeight;
                            }
                        }
                        
                        badgeCtx.drawImage(slotData.image, 
                            sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
                            offsetX, offsetY, scaledWidth, scaledHeight);
                        
                        // Restore flip transformations
                        if (transform.flipHorizontal || transform.flipVertical) {
                            badgeCtx.restore();
                        }
                        
                        badgeCtx.restore();
                    }
                    
                    // Add to PDF with exact dimensions
                    const imageData = badgeCanvas.toDataURL('image/png', 1.0); // Use PNG for better quality
                    // Add image with exact badge dimensions to ensure proper scaling
                    pdf.addImage(imageData, 'PNG', x, y, badgeSize, badgeSize, '', 'FAST');
                    
                    // Add cut guides if enabled
                    if (showCutGuides) {
                        pdf.setDrawColor(0, 0, 0);
                        pdf.setLineWidth(0.1);
                        
                        // Draw cutting guides (all centered)
                        const designOffset = (badgeSize - 50) / 2; // Center the 50mm design
                        const dieCutOffset = (badgeSize - 61) / 2; // Center the 61mm die cut
                        
                        // Design area (50mm)
                        pdf.rect(x + designOffset, y + designOffset, 50, 50);
                        
                        // Die cut area (61mm)
                        pdf.rect(x + dieCutOffset, y + dieCutOffset, 61, 61);
                        
                        // Rotary cut (full size - 66mm)
                        pdf.rect(x, y, badgeSize, badgeSize);
                    }
                    
                    // Add grid guides if enabled
                    if (showGridGuides) {
                        pdf.setDrawColor(0, 0, 0);
                        pdf.setLineWidth(0.05); // Thinner lines to avoid visual gaps
                        
                        // Draw border around each badge
                        pdf.rect(x, y, badgeSize, badgeSize);
                    }
                } else if (showCutGuides) {
                    // Draw empty slot guides
                    pdf.setDrawColor(200, 200, 200);
                    pdf.setLineWidth(0.05);
                    pdf.rect(x, y, badgeSize, badgeSize);
                }
                
                // Add grid guides for empty slots too if enabled
                if (showGridGuides) {
                    pdf.setDrawColor(0, 0, 0);
                    pdf.setLineWidth(0.05);
                    
                    // Draw border around empty slot
                    pdf.rect(x, y, badgeSize, badgeSize);
                }
            }
            
            // Add MagniStyle logo to PDF
            try {
                const logoImg = new Image();
                logoImg.onload = () => {
                    const logoCanvas = document.createElement('canvas');
                    const logoCtx = logoCanvas.getContext('2d');
                    logoCanvas.width = 30;
                    logoCanvas.height = 30;
                    logoCtx.drawImage(logoImg, 0, 0, 30, 30);
                    const logoData = logoCanvas.toDataURL('image/png');
                    pdf.addImage(logoData, 'PNG', 180, 10, 30, 30);
                };
                logoImg.src = 'MagniStyle.svg';
            } catch (logoError) {
                console.log('Logo not available for PDF');
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            pdf.save(`MagniStyle-badge-grid-${timestamp}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BadgeTemplateCreator();
    
    // Initialize standalone preview toggle and drag functionality
    // Add a small delay to ensure DOM is fully loaded
    setTimeout(() => {
        const togglePreviewBtn = document.getElementById('togglePreview');
        const standalonePreview = document.getElementById('standalonePreview');
        const previewHeader = document.getElementById('previewHeader');
        
        console.log('Preview elements found:', {
            togglePreviewBtn: !!togglePreviewBtn,
            standalonePreview: !!standalonePreview,
            previewHeader: !!previewHeader
        });
        
        // Skip initialization if preview elements don't exist
        if (!togglePreviewBtn || !standalonePreview || !previewHeader) {
            console.log('Preview elements not found, skipping initialization');
            return;
        }
        // Initialize in collapsed state
        standalonePreview.classList.add('collapsed');
        standalonePreview.style.display = 'block';
        standalonePreview.style.visibility = 'visible';
        standalonePreview.style.opacity = '1';
        
        // Set initial arrow direction for collapsed state
        const arrow = togglePreviewBtn.querySelector('svg');
        if (arrow) {
            arrow.style.transform = 'rotate(180deg)';
        }
        
        // Toggle functionality
        togglePreviewBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent drag when clicking toggle
            standalonePreview.classList.toggle('collapsed');
            standalonePreview.classList.toggle('expanded');
            
            // Update arrow direction
            const arrow = togglePreviewBtn.querySelector('svg');
            if (standalonePreview.classList.contains('collapsed')) {
                arrow.style.transform = 'rotate(180deg)';
            } else {
                arrow.style.transform = 'rotate(0deg)';
            }
        });
        
        // Prevent clicks on preview content from interfering
        standalonePreview.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Drag functionality
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        let animationFrame = null;
        
        // Add drag events to the drag handle
        const dragHandle = previewHeader.querySelector('.drag-handle');
        if (dragHandle) {
            dragHandle.addEventListener('mousedown', dragStart, { passive: false });
            dragHandle.addEventListener('touchstart', dragStart, { passive: false });
            
            // Prevent clicks on drag handle from bubbling up
            dragHandle.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
        }
        
        // Add drag events to the collapsed icon
        const collapsedIcon = standalonePreview.querySelector('.collapsed-icon');
        if (collapsedIcon) {
            collapsedIcon.addEventListener('mousedown', dragStart, { passive: false });
            collapsedIcon.addEventListener('touchstart', dragStart, { passive: false });
            
            // Click to expand when collapsed
            collapsedIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                standalonePreview.classList.remove('collapsed');
                standalonePreview.classList.add('expanded');
                
                // Update arrow direction
                const arrow = togglePreviewBtn.querySelector('svg');
                arrow.style.transform = 'rotate(0deg)';
            });
        }
        
        document.addEventListener('mousemove', drag, { passive: false });
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);
        
        // Handle window resize to keep preview within bounds
        window.addEventListener('resize', () => {
            if (!isDragging) {
                const rect = standalonePreview.getBoundingClientRect();
                const previewWidth = rect.width;
                const previewHeight = rect.height;
                const maxX = window.innerWidth - previewWidth;
                const maxY = window.innerHeight - previewHeight;
                
                // Check if current position is out of bounds
                const currentX = rect.left;
                const currentY = rect.top;
                
                if (currentX > maxX || currentY > maxY || currentX < 0 || currentY < 0) {
                    // Reposition to stay within bounds
                    const clampedX = Math.max(0, Math.min(currentX, maxX));
                    const clampedY = Math.max(0, Math.min(currentY, maxY));
                    
                    standalonePreview.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
                    xOffset = clampedX;
                    yOffset = clampedY;
                }
            }
        });
        
        function dragStart(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Get current position of the preview
            const rect = standalonePreview.getBoundingClientRect();
            
            if (e.type === 'touchstart') {
                initialX = e.touches[0].clientX - rect.left;
                initialY = e.touches[0].clientY - rect.top;
            } else {
                initialX = e.clientX - rect.left;
                initialY = e.clientY - rect.top;
            }
            
            isDragging = true;
            
            // Add dragging class to appropriate element
            if (standalonePreview.classList.contains('collapsed')) {
                const collapsedIcon = standalonePreview.querySelector('.collapsed-icon');
                if (collapsedIcon) {
                    collapsedIcon.classList.add('dragging');
                }
            } else {
                previewHeader.classList.add('dragging');
            }
            
            // Switch to absolute positioning for dragging
            standalonePreview.style.position = 'absolute';
            standalonePreview.style.top = rect.top + 'px';
            standalonePreview.style.left = rect.left + 'px';
            standalonePreview.style.right = 'auto';
            standalonePreview.style.bottom = 'auto';
            standalonePreview.style.transform = 'none';
            
            // Add dragging class for visual feedback
            standalonePreview.classList.add('dragging');
            
            
        }
        
        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
                
                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }
                
                // Cancel previous animation frame
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                // Use requestAnimationFrame for smooth updates
                animationFrame = requestAnimationFrame(() => {
                    // Get current dimensions of the preview
                    const rect = standalonePreview.getBoundingClientRect();
                    const previewWidth = rect.width;
                    const previewHeight = rect.height;
                    
                    // Calculate maximum allowed positions to keep within screen
                    // For expanded state, ensure it never goes beyond screen bounds
                    const maxX = window.innerWidth - previewWidth;
                    const maxY = window.innerHeight - previewHeight;
                    
                    // Additional constraint for expanded state to ensure full visibility
                    const isExpanded = !standalonePreview.classList.contains('collapsed');
                    if (isExpanded) {
                        // Ensure expanded state has some padding from edges
                        const padding = 10;
                        const constrainedMaxX = Math.max(0, maxX - padding);
                        const constrainedMaxY = Math.max(0, maxY - padding);
                        const constrainedMinX = padding;
                        const constrainedMinY = padding;
                    }
                    
                    // Apply bounce-back effect when dragging beyond edges
                    let constrainedX = currentX;
                    let constrainedY = currentY;
                    let bounced = false;
                    
                    // Use different constraints for expanded vs collapsed state
                    const minX = isExpanded ? 10 : 0;
                    const minY = isExpanded ? 10 : 0;
                    const effectiveMaxX = isExpanded ? Math.max(0, maxX - 10) : maxX;
                    const effectiveMaxY = isExpanded ? Math.max(0, maxY - 10) : maxY;
                    
                    // Bounce back from left edge
                    if (currentX < minX) {
                        constrainedX = minX;
                        bounced = true;
                    }
                    // Bounce back from right edge
                    else if (currentX > effectiveMaxX) {
                        constrainedX = effectiveMaxX;
                        bounced = true;
                    }
                    
                    // Bounce back from top edge
                    if (currentY < minY) {
                        constrainedY = minY;
                        bounced = true;
                    }
                    // Bounce back from bottom edge
                    else if (currentY > effectiveMaxY) {
                        constrainedY = effectiveMaxY;
                        bounced = true;
                    }
                    
                    // Add bouncing class for visual feedback
                    if (bounced) {
                        standalonePreview.classList.add('bouncing');
                        setTimeout(() => {
                            standalonePreview.classList.remove('bouncing');
                        }, 200);
                    }
                    
                    // Update position using absolute positioning
                    standalonePreview.style.left = constrainedX + 'px';
                    standalonePreview.style.top = constrainedY + 'px';
                    
                });
            }
        }
        
        function dragEnd() {
            if (isDragging) {
                isDragging = false;
                
                // Cancel any pending animation frame
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                    animationFrame = null;
                }
                
                // Remove dragging class from appropriate element
                standalonePreview.classList.remove('dragging');
                if (standalonePreview.classList.contains('collapsed')) {
                    const collapsedIcon = standalonePreview.querySelector('.collapsed-icon');
                    if (collapsedIcon) {
                        collapsedIcon.classList.remove('dragging');
                    }
                } else {
                    previewHeader.classList.remove('dragging');
                }
                
                // Get the current position from absolute positioning
                const rect = standalonePreview.getBoundingClientRect();
                const finalX = rect.left;
                const finalY = rect.top;
                
                // Ensure the preview stays within screen bounds
                const previewWidth = rect.width;
                const previewHeight = rect.height;
                const maxX = window.innerWidth - previewWidth;
                const maxY = window.innerHeight - previewHeight;
                
                // Apply bounce-back effect for final position
                let clampedX = finalX;
                let clampedY = finalY;
                let bounced = false;
                
                // Use different constraints for expanded vs collapsed state
                const isExpanded = !standalonePreview.classList.contains('collapsed');
                const minX = isExpanded ? 10 : 0;
                const minY = isExpanded ? 10 : 0;
                const effectiveMaxX = isExpanded ? Math.max(0, maxX - 10) : maxX;
                const effectiveMaxY = isExpanded ? Math.max(0, maxY - 10) : maxY;
                
                // Bounce back from edges
                if (finalX < minX) {
                    clampedX = minX;
                    bounced = true;
                } else if (finalX > effectiveMaxX) {
                    clampedX = effectiveMaxX;
                    bounced = true;
                }
                
                if (finalY < minY) {
                    clampedY = minY;
                    bounced = true;
                } else if (finalY > effectiveMaxY) {
                    clampedY = effectiveMaxY;
                    bounced = true;
                }
                
                // Add bouncing class for visual feedback
                if (bounced) {
                    standalonePreview.classList.add('bouncing');
                    setTimeout(() => {
                        standalonePreview.classList.remove('bouncing');
                    }, 200);
                }
                
                // Restore fixed positioning with clamped coordinates
                standalonePreview.style.position = 'fixed';
                standalonePreview.style.top = '0px';
            }
        }
    }, 100); // Close setTimeout callback
}); // Close DOMContentLoaded listener


// Add new scaling and positioning methods
BadgeTemplateCreator.prototype.redrawSlotCanvas = function(slotIndex) {
    const slotData = this.gridSlots[slotIndex];
    if (!slotData) return;
    
    const canvas = slotData.canvas;
    const ctx = canvas.getContext('2d');
    const img = slotData.image;
    const adjustments = this.getCurrentAdjustments(); // Use grid adjustments
    const transform = slotData.transform;
    
    // Calculate image dimensions and positioning based on fit mode and scale
    const canvasSize = canvas.width;
    
    // Calculate source crop coordinates first
    const sourceCropLeft = (transform.cropLeft / 100) * img.width;
    const sourceCropTop = (transform.cropTop / 100) * img.height;
    const sourceCropWidth = img.width - sourceCropLeft - (transform.cropRight / 100) * img.width;
    const sourceCropHeight = img.height - sourceCropTop - (transform.cropBottom / 100) * img.height;
    
    // IMPORTANT: Use ORIGINAL image dimensions for scaling calculations to prevent zoom-in effect when cropping
    // The crop is applied via source rectangle in drawImage, not by changing the scale
    const imageWidth = img.width;
    const imageHeight = img.height;
    
    // Apply user scale and fine zoom
    const userScale = transform.scale / 100;
    const fineZoomScale = transform.fineZoom / 100;
    const totalScale = userScale * fineZoomScale;
    
    // Calculate margin (same as used in PDF generation)
    // Use the correct margin element based on current mode
    const isSingleMode = this.currentMode === 'single';
    const marginElement = isSingleMode ? document.getElementById('badgeMargin') : document.getElementById('gridBadgeMargin');
    const userMarginMm = parseFloat(marginElement.value);
    const badgeSizeMm = 66; // Standard badge size
    const imageSizeMm = badgeSizeMm - (2 * userMarginMm);
    const marginRatio = userMarginMm / badgeSizeMm;
    const imageRatio = imageSizeMm / badgeSizeMm;
    
    // Calculate margin and image area in pixels for this canvas
    const marginPixels = canvasSize * marginRatio;
    const imageAreaSize = canvasSize * imageRatio;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    
    let scaledWidth, scaledHeight, offsetX, offsetY;
    
    // Scale based on IMAGE AREA, not full canvas
    switch (transform.fitMode) {
        case 'contain':
            // Fit entire image within image area (no cropping)
            const scaleToFit = Math.min(imageAreaSize / imageWidth, imageAreaSize / imageHeight) * totalScale;
            // Calculate scaled dimensions based on CROPPED content
            scaledWidth = sourceCropWidth * (scaleToFit * imageWidth / img.width);
            scaledHeight = sourceCropHeight * (scaleToFit * imageHeight / img.height);
            offsetX = (imageAreaSize - scaledWidth) / 2;
            offsetY = (imageAreaSize - scaledHeight) / 2;
            break;
            
        case 'fill':
            // Stretch image to fill entire image area (may distort)
            // For fill mode, scale based on original dimensions then crop
            const fillScale = imageAreaSize / imageWidth * totalScale;
            scaledWidth = sourceCropWidth * fillScale;
            scaledHeight = sourceCropHeight * fillScale;
            offsetX = (imageAreaSize - scaledWidth) / 2;
            offsetY = (imageAreaSize - scaledHeight) / 2;
            break;
            
        case 'cover':
        default:
            // Fill image area completely (crop image to fit image area bounds)
            // Calculate scale based on ORIGINAL dimensions to maintain consistent zoom level
            const scaleToFill = Math.max(imageAreaSize / imageWidth, imageAreaSize / imageHeight) * totalScale;
            // Apply this scale to the CROPPED portion
            scaledWidth = sourceCropWidth * scaleToFill;
            scaledHeight = sourceCropHeight * scaleToFill;
            offsetX = (imageAreaSize - scaledWidth) / 2;
            offsetY = (imageAreaSize - scaledHeight) / 2;
            break;
    }
    
    // Apply user position offsets (within the image area, not the full canvas)
    offsetX += (transform.offsetX / 100) * imageAreaSize;
    offsetY += (transform.offsetY / 100) * imageAreaSize;
    
    // Offset to account for margin
    offsetX += marginPixels;
    offsetY += marginPixels;
    
    
    // Save context for corner radius clipping (will be applied after transforms)
    ctx.save();
    
    // Apply rotation FIRST (before corner radius) - rotate around IMAGE CENTER, not canvas center
    if (transform.rotation !== 0) {
        const imageCenterX = marginPixels + imageAreaSize / 2;
        const imageCenterY = marginPixels + imageAreaSize / 2;
        ctx.translate(imageCenterX, imageCenterY);
        ctx.rotate((transform.rotation * Math.PI) / 180);
        ctx.translate(-imageCenterX, -imageCenterY);
    }
    
    // Apply corner radius clipping AFTER rotation - to IMAGE AREA, not full canvas
    ctx.beginPath();
    ctx.roundRect(marginPixels, marginPixels, imageAreaSize, imageAreaSize, adjustments.cornerRadius);
    ctx.clip();
    
    // Draw background if image is zoomed out (AFTER clip is applied)
    if (totalScale < 1.0) {
        this.drawBackground(ctx, imageAreaSize, img, transform, marginPixels);
    }
    
    // Apply flip transformations (relative to image area center)
    if (transform.flipHorizontal || transform.flipVertical) {
        ctx.save();
        const imageCenterX = marginPixels + imageAreaSize / 2;
        const imageCenterY = marginPixels + imageAreaSize / 2;
        
        if (transform.flipHorizontal) {
            ctx.translate(imageCenterX, 0);
            ctx.scale(-1, 1);
            ctx.translate(-imageCenterX, 0);
            offsetX = 2 * imageCenterX - offsetX - scaledWidth;
        }
        if (transform.flipVertical) {
            ctx.translate(0, imageCenterY);
            ctx.scale(1, -1);
            ctx.translate(0, -imageCenterY);
            offsetY = 2 * imageCenterY - offsetY - scaledHeight;
        }
    }
    
    // Apply adjustments if needed
    if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) {
        // Create temporary canvas for adjustments
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        
        // Draw cropped portion to temp canvas
        tempCtx.drawImage(img, 
            sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
            0, 0, scaledWidth, scaledHeight);
        const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        this.applyImageFilters(imageData, adjustments);
        tempCtx.putImageData(imageData, 0, 0);
        
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
    } else {
        // Draw cropped portion directly using source rectangle parameters
        // This ensures proper cropping by specifying source crop coordinates
        ctx.drawImage(img,
            sourceCropLeft, sourceCropTop, sourceCropWidth, sourceCropHeight,
            offsetX, offsetY, scaledWidth, scaledHeight);
    }
    
    // Restore flip transformations
    if (transform.flipHorizontal || transform.flipVertical) {
        ctx.restore();
    }
    
    ctx.restore();
    
    // Draw grid guides overlay if enabled
    const showGridGuides = document.getElementById('showGridGuides').checked;
    if (showGridGuides) {
        this.drawGridGuidesOverlay(ctx, canvasSize);
    }
};

BadgeTemplateCreator.prototype.onCropChange = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const slotData = this.gridSlots[this.currentSelectedSlot];

        // Get crop values from controls
        const cropTop = parseInt(document.getElementById('cropTop').value) || 0;
        const cropBottom = parseInt(document.getElementById('cropBottom').value) || 0;
        const cropLeft = parseInt(document.getElementById('cropLeft').value) || 0;
        const cropRight = parseInt(document.getElementById('cropRight').value) || 0;

        // Update value displays using nextElementSibling (consistent with updateTransformControls)
        const cropTopEl = document.getElementById('cropTop');
        const cropBottomEl = document.getElementById('cropBottom');
        const cropLeftEl = document.getElementById('cropLeft');
        const cropRightEl = document.getElementById('cropRight');

        if (cropTopEl && cropTopEl.nextElementSibling) cropTopEl.nextElementSibling.textContent = cropTop + '%';
        if (cropBottomEl && cropBottomEl.nextElementSibling) cropBottomEl.nextElementSibling.textContent = cropBottom + '%';
        if (cropLeftEl && cropLeftEl.nextElementSibling) cropLeftEl.nextElementSibling.textContent = cropLeft + '%';
        if (cropRightEl && cropRightEl.nextElementSibling) cropRightEl.nextElementSibling.textContent = cropRight + '%';

        // Update transform values
        slotData.transform.cropTop = cropTop;
        slotData.transform.cropBottom = cropBottom;
        slotData.transform.cropLeft = cropLeft;
        slotData.transform.cropRight = cropRight;

        // Add visual feedback
        this.highlightActiveSlot();

        // Redraw the slot with new crop values - only redraw canvas, don't update DOM
        this.redrawSlotCanvas(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.updateTransformControls = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const slotData = this.gridSlots[this.currentSelectedSlot];
        const transform = slotData.transform;
        
        // Update scale control
        const imageScale = document.getElementById('imageScale');
        if (imageScale) {
            imageScale.value = transform.scale;
            // Find the value display span - it's a sibling of the scale-control div
            const scaleControl = imageScale.closest('.scale-control');
            if (scaleControl) {
                const valueDisplay = scaleControl.querySelector('.value-display');
                if (valueDisplay) {
                    valueDisplay.textContent = transform.scale + '%';
                }
            }
        }
        
        // Update rotation control
        const imageRotation = document.getElementById('imageRotation');
        if (imageRotation) {
            imageRotation.value = transform.rotation;
            // Find the value display span - it's a sibling of the rotation-control div
            const rotationControl = imageRotation.closest('.rotation-control');
            if (rotationControl) {
                const valueDisplay = rotationControl.querySelector('.value-display');
                if (valueDisplay) {
                    valueDisplay.textContent = transform.rotation + '°';
                }
            }
        }
        
        // Update rotation indicator
        this.updateRotationIndicator(transform.rotation);
        
        // Update fit mode buttons
        const fitButtons = document.querySelectorAll('.fit-btn');
        fitButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === transform.fitMode);
        });
        
        // Update flip buttons
        const flipHorizontal = document.getElementById('flipHorizontal');
        const flipVertical = document.getElementById('flipVertical');
        if (flipHorizontal) {
            flipHorizontal.classList.toggle('active', transform.flipHorizontal);
        }
        if (flipVertical) {
            flipVertical.classList.toggle('active', transform.flipVertical);
        }
        
        // Update crop controls
        const cropTop = document.getElementById('cropTop');
        if (cropTop) {
            cropTop.value = transform.cropTop;
            cropTop.nextElementSibling.textContent = transform.cropTop + '%';
        }
        
        const cropBottom = document.getElementById('cropBottom');
        if (cropBottom) {
            cropBottom.value = transform.cropBottom;
            cropBottom.nextElementSibling.textContent = transform.cropBottom + '%';
        }
        
        const cropLeft = document.getElementById('cropLeft');
        if (cropLeft) {
            cropLeft.value = transform.cropLeft;
            cropLeft.nextElementSibling.textContent = transform.cropLeft + '%';
        }
        
        const cropRight = document.getElementById('cropRight');
        if (cropRight) {
            cropRight.value = transform.cropRight;
            cropRight.nextElementSibling.textContent = transform.cropRight + '%';
        }
        
        // Update fine zoom control
        const fineZoom = document.getElementById('fineZoom');
        if (fineZoom) {
            fineZoom.value = transform.fineZoom;
            fineZoom.nextElementSibling.textContent = transform.fineZoom + '%';
        }
        
        // Update background controls
        const bgBtns = document.querySelectorAll('.bg-btn');
        bgBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === transform.backgroundMode);
        });
        
        const colorControl = document.getElementById('backgroundColorControl');
        const blurControl = document.getElementById('backgroundBlurControl');
        if (transform.backgroundMode === 'color') {
            colorControl.classList.remove('hidden');
            blurControl.classList.add('hidden');
        } else {
            colorControl.classList.add('hidden');
            blurControl.classList.remove('hidden');
        }
        
        const backgroundColor = document.getElementById('backgroundColor');
        if (backgroundColor) {
            backgroundColor.value = transform.backgroundColor;
            const colorLabel = document.querySelector('.color-label');
            if (colorLabel) {
                colorLabel.textContent = this.getColorName(transform.backgroundColor);
            }
        }
        
        const backgroundBlur = document.getElementById('backgroundBlur');
        if (backgroundBlur) {
            backgroundBlur.value = transform.backgroundBlur;
            backgroundBlur.nextElementSibling.textContent = transform.backgroundBlur + 'px';
        }
    }
};

BadgeTemplateCreator.prototype.onFineZoomChange = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const fineZoom = parseInt(document.getElementById('fineZoom').value);
        this.gridSlots[this.currentSelectedSlot].transform.fineZoom = fineZoom;
        
        // Update display
        const fineZoomDisplay = document.getElementById('fineZoom').nextElementSibling;
        if (fineZoomDisplay) {
            fineZoomDisplay.textContent = fineZoom + '%';
        }
        
        // Add visual feedback
        this.highlightActiveSlot();
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.highlightActiveSlot = function() {
    if (this.currentSelectedSlot !== null) {
        const slotElement = document.querySelector(`.grid-slot:nth-child(${this.currentSelectedSlot + 1})`);
        if (slotElement) {
            slotElement.classList.add('live-preview');
            // Remove highlight after a short delay
            setTimeout(() => {
                slotElement.classList.remove('live-preview');
            }, 200);
        }
    }
};

BadgeTemplateCreator.prototype.adjustScale = function(delta) {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const currentScale = this.gridSlots[this.currentSelectedSlot].transform.scale;
        const newScale = Math.max(10, Math.min(500, currentScale + delta));
        
        this.gridSlots[this.currentSelectedSlot].transform.scale = newScale;
        
        // Update control
        const imageScale = document.getElementById('imageScale');
        if (imageScale) {
            imageScale.value = newScale;
            const scaleControl = imageScale.closest('.scale-control');
            if (scaleControl) {
                const valueDisplay = scaleControl.querySelector('.value-display');
                if (valueDisplay) {
                    valueDisplay.textContent = newScale + '%';
                }
            }
        }
        
        // Add visual feedback
        this.highlightActiveSlot();
        
        // Update display
        this.redrawSlotCanvas(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.onBackgroundModeChange = function(event) {
    const mode = event.target.dataset.mode;
    
    // Update button states
    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Show/hide appropriate controls
    const colorControl = document.getElementById('backgroundColorControl');
    const blurControl = document.getElementById('backgroundBlurControl');
    
    if (mode === 'color') {
        colorControl.classList.remove('hidden');
        blurControl.classList.add('hidden');
    } else {
        colorControl.classList.add('hidden');
        blurControl.classList.remove('hidden');
    }
    
    // Update transform if slot is selected
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        this.gridSlots[this.currentSelectedSlot].transform.backgroundMode = mode;
        this.redrawSlotCanvas(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.onBackgroundColorChange = function(event) {
    const color = event.target.value;
    
    // Update color label
    const colorLabel = document.querySelector('.color-label');
    if (colorLabel) {
        colorLabel.textContent = this.getColorName(color);
    }
    
    // Update transform if slot is selected
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        this.gridSlots[this.currentSelectedSlot].transform.backgroundColor = color;
        this.redrawSlotCanvas(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.onBackgroundBlurChange = function(event) {
    const blur = parseInt(event.target.value);
    
    // Update value display
    const valueDisplay = event.target.nextElementSibling;
    if (valueDisplay) {
        valueDisplay.textContent = blur + 'px';
    }
    
    // Update transform if slot is selected
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        this.gridSlots[this.currentSelectedSlot].transform.backgroundBlur = blur;
        this.redrawSlotCanvas(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.getColorName = function(hex) {
    const colors = {
        '#ffffff': 'White',
        '#000000': 'Black',
        '#ff0000': 'Red',
        '#00ff00': 'Green',
        '#0000ff': 'Blue',
        '#ffff00': 'Yellow',
        '#ff00ff': 'Magenta',
        '#00ffff': 'Cyan',
        '#808080': 'Gray',
        '#c0c0c0': 'Silver'
    };
    return colors[hex.toLowerCase()] || hex.toUpperCase();
};

BadgeTemplateCreator.prototype.drawBackground = function(ctx, size, img, transform, marginPixels = 0) {
    ctx.save();
    
    if (transform.backgroundMode === 'color') {
        // Draw solid color background within image area
        ctx.fillStyle = transform.backgroundColor;
        ctx.fillRect(marginPixels, marginPixels, size, size);
    } else if (transform.backgroundMode === 'blur') {
        // Draw blurred image background within image area
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = size;
        tempCanvas.height = size;
        
        // Draw image to fill entire background
        const scale = Math.max(size / img.width, size / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (size - scaledWidth) / 2;
        const offsetY = (size - scaledHeight) / 2;
        
        tempCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        // Apply blur effect - draw to image area only
        ctx.filter = `blur(${transform.backgroundBlur}px)`;
        ctx.drawImage(tempCanvas, marginPixels, marginPixels, size, size);
        ctx.filter = 'none';
    }
    
    ctx.restore();
};

BadgeTemplateCreator.prototype.drawBackgroundPDF = function(ctx, size, img, transform, marginX = 0, marginY = null) {
    ctx.save();
    
    // If marginY is not provided, use marginX for both (backward compatibility)
    if (marginY === null) {
        marginY = marginX;
    }
    
    if (transform.backgroundMode === 'color') {
        // Draw solid color background within image area
        ctx.fillStyle = transform.backgroundColor;
        ctx.fillRect(marginX, marginY, size, size);
    } else if (transform.backgroundMode === 'blur') {
        // Draw blurred image background within image area
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = size;
        tempCanvas.height = size;
        
        // Draw image to fill entire background
        const scale = Math.max(size / img.width, size / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (size - scaledWidth) / 2;
        const offsetY = (size - scaledHeight) / 2;
        
        tempCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        // Apply blur effect - draw to image area only
        ctx.filter = `blur(${transform.backgroundBlur}px)`;
        ctx.drawImage(tempCanvas, marginX, marginY, size, size);
        ctx.filter = 'none';
    }
    
    ctx.restore();
};

BadgeTemplateCreator.prototype.adjustFineZoom = function(delta) {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const currentFineZoom = this.gridSlots[this.currentSelectedSlot].transform.fineZoom;
        const newFineZoom = Math.max(10, Math.min(500, currentFineZoom + delta));
        
        this.gridSlots[this.currentSelectedSlot].transform.fineZoom = newFineZoom;
        
        // Update control
        const fineZoomControl = document.getElementById('fineZoom');
        if (fineZoomControl) {
            fineZoomControl.value = newFineZoom;
            fineZoomControl.nextElementSibling.textContent = newFineZoom + '%';
        }
        
        // Add visual feedback
        this.highlightActiveSlot();
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.onImageScaleChange = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const scale = parseInt(document.getElementById('imageScale').value);
        this.gridSlots[this.currentSelectedSlot].transform.scale = scale;
        
        // Update display
        const imageScale = document.getElementById('imageScale');
        const scaleControl = imageScale.closest('.scale-control');
        if (scaleControl) {
            const valueDisplay = scaleControl.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = scale + '%';
            }
        }
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.adjustScale = function(delta) {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const currentScale = this.gridSlots[this.currentSelectedSlot].transform.scale;
        const newScale = Math.max(10, Math.min(500, currentScale + delta));
        
        this.gridSlots[this.currentSelectedSlot].transform.scale = newScale;
        
        // Update controls
        const imageScale = document.getElementById('imageScale');
        if (imageScale) {
            imageScale.value = newScale;
            const scaleControl = imageScale.closest('.scale-control');
            if (scaleControl) {
                const valueDisplay = scaleControl.querySelector('.value-display');
                if (valueDisplay) {
                    valueDisplay.textContent = newScale + '%';
                }
            }
        }
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.adjustPosition = function(deltaX, deltaY) {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const transform = this.gridSlots[this.currentSelectedSlot].transform;
        transform.offsetX = Math.max(-50, Math.min(50, transform.offsetX + deltaX));
        transform.offsetY = Math.max(-50, Math.min(50, transform.offsetY + deltaY));
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.onImageRotationChange = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const rotation = parseInt(document.getElementById('imageRotation').value);
        this.gridSlots[this.currentSelectedSlot].transform.rotation = rotation;
        
        // Update display
        const imageRotation = document.getElementById('imageRotation');
        const rotationControl = imageRotation.closest('.rotation-control');
        if (rotationControl) {
            const valueDisplay = rotationControl.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = rotation + '°';
            }
        }
        
        // Update rotation indicator
        this.updateRotationIndicator(rotation);
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.updateRotationIndicator = function(rotation) {
    const indicator = document.getElementById('rotationIndicator');
    if (indicator) {
        // Convert rotation to percentage for positioning
        const percentage = ((rotation + 180) / 360) * 100;
        const position = Math.max(0, Math.min(100, percentage));
        
        // Position the indicator along the wheel
        indicator.style.left = `${position}%`;
        indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    }
};

BadgeTemplateCreator.prototype.adjustRotation = function(delta) {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const currentRotation = this.gridSlots[this.currentSelectedSlot].transform.rotation;
        const newRotation = Math.max(-180, Math.min(180, currentRotation + delta));
        
        this.gridSlots[this.currentSelectedSlot].transform.rotation = newRotation;
        
        // Update controls
        const imageRotation = document.getElementById('imageRotation');
        if (imageRotation) {
            imageRotation.value = newRotation;
            const rotationControl = imageRotation.closest('.rotation-control');
            if (rotationControl) {
                const valueDisplay = rotationControl.querySelector('.value-display');
                if (valueDisplay) {
                    valueDisplay.textContent = newRotation + '°';
                }
            }
        }
        
        // Update rotation indicator
        this.updateRotationIndicator(newRotation);
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.toggleFlipHorizontal = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const transform = this.gridSlots[this.currentSelectedSlot].transform;
        transform.flipHorizontal = !transform.flipHorizontal;
        
        // Update button state
        const flipBtn = document.getElementById('flipHorizontal');
        if (flipBtn) {
            flipBtn.classList.toggle('active', transform.flipHorizontal);
        }
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.toggleFlipVertical = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        const transform = this.gridSlots[this.currentSelectedSlot].transform;
        transform.flipVertical = !transform.flipVertical;
        
        // Update button state
        const flipBtn = document.getElementById('flipVertical');
        if (flipBtn) {
            flipBtn.classList.toggle('active', transform.flipVertical);
        }
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.setFitMode = function(mode) {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        this.gridSlots[this.currentSelectedSlot].transform.fitMode = mode;
        
        // Update button states
        const fitButtons = document.querySelectorAll('.fit-btn');
        fitButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.resetImageTransform = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot]) {
        // Reset transform values
        this.gridSlots[this.currentSelectedSlot].transform.scale = 100;
        this.gridSlots[this.currentSelectedSlot].transform.fitMode = 'cover';
        this.gridSlots[this.currentSelectedSlot].transform.offsetX = 0;
        this.gridSlots[this.currentSelectedSlot].transform.offsetY = 0;
        this.gridSlots[this.currentSelectedSlot].transform.rotation = 0;
        this.gridSlots[this.currentSelectedSlot].transform.flipHorizontal = false;
        this.gridSlots[this.currentSelectedSlot].transform.flipVertical = false;
        
        // Reset crop and fine zoom values
        this.gridSlots[this.currentSelectedSlot].transform.cropTop = 0;
        this.gridSlots[this.currentSelectedSlot].transform.cropBottom = 0;
        this.gridSlots[this.currentSelectedSlot].transform.cropLeft = 0;
        this.gridSlots[this.currentSelectedSlot].transform.cropRight = 0;
        this.gridSlots[this.currentSelectedSlot].transform.fineZoom = 100;
        
        // Update controls
        this.updateTransformControls();
        
        // Redraw the slot
        this.updateSlotDisplay(this.currentSelectedSlot);
        this.updateImagePreview();
    }
};

BadgeTemplateCreator.prototype.applyTransformToSelected = function() {
    if (this.currentSelectedSlot !== null && this.gridSlots[this.currentSelectedSlot] && this.selectedSlots.size > 1) {
        const sourceSlot = this.gridSlots[this.currentSelectedSlot];
        const sourceTransform = sourceSlot.transform;
        
        // Apply the transform settings from the current slot to all other selected slots
        this.selectedSlots.forEach(slotIndex => {
            if (slotIndex !== this.currentSelectedSlot && this.gridSlots[slotIndex]) {
                this.gridSlots[slotIndex].transform = {
                    scale: sourceTransform.scale,
                    fitMode: sourceTransform.fitMode,
                    offsetX: sourceTransform.offsetX,
                    offsetY: sourceTransform.offsetY,
                    rotation: sourceTransform.rotation,
                    flipHorizontal: sourceTransform.flipHorizontal,
                    flipVertical: sourceTransform.flipVertical
                };
                
                // Redraw the slot
                this.updateSlotDisplay(slotIndex);
            }
        });
        
        // Update the preview
        this.updateImagePreview();
        
        // Show feedback
        const count = this.selectedSlots.size - 1; // Exclude the source slot
        console.log(`Applied transform settings to ${count} selected slots`);
    }
};
