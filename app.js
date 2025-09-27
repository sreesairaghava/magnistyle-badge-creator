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
        
        // Canvas references
        this.mainCanvas = document.getElementById('mainCanvas');
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.templateCanvas = document.getElementById('templateCanvas');
        this.templateCtx = this.templateCanvas.getContext('2d');
        
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
        this.updateUI();
        this.drawTemplate();
        this.updateGridDisplay(); // Initialize grid guides state
        this.initializePreviewModal();
        this.initializeCollapsiblePanel();
        this.initializeAdjustmentsPanel();
        this.initializeImagePreview();
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
        
        // Grid mode checkboxes
        const gridShowGuides = document.getElementById('gridShowGuides');
        if (gridShowGuides) gridShowGuides.addEventListener('change', this.drawTemplate.bind(this));
        
        const showGridGuides = document.getElementById('showGridGuides');
        if (showGridGuides) showGridGuides.addEventListener('change', () => {
            this.updateGridDisplay();
            // Simple test to verify toggle is working
            const isChecked = document.getElementById('showGridGuides').checked;
            console.log('Grid guides toggle:', isChecked ? 'ON' : 'OFF');
        });
        
        const gridTemplateOpacity = document.getElementById('gridTemplateOpacity');
        if (gridTemplateOpacity) gridTemplateOpacity.addEventListener('input', this.updateTemplateOpacity.bind(this));
        
        // Batch controls (only if elements exist)
        const applyToSelected = document.getElementById('applyToSelected');
        if (applyToSelected) applyToSelected.addEventListener('click', this.applyToSelected.bind(this));
        
        const applyToAll = document.getElementById('applyToAll');
        if (applyToAll) applyToAll.addEventListener('click', this.applyToAll.bind(this));
        
        const resetAdjustments = document.getElementById('resetAdjustments');
        if (resetAdjustments) resetAdjustments.addEventListener('click', this.resetAdjustments.bind(this));
        
        // Crop controls (only if elements exist)
        const enableCrop = document.getElementById('enableCrop');
        if (enableCrop) enableCrop.addEventListener('click', this.enableCrop.bind(this));
        
        const applyCrop = document.getElementById('applyCrop');
        if (applyCrop) applyCrop.addEventListener('click', this.applyCrop.bind(this));
        
        const resetCrop = document.getElementById('resetCrop');
        if (resetCrop) resetCrop.addEventListener('click', this.resetCrop.bind(this));
        
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
        
        if (toggleBtn && panel) {
            // Start expanded by default
            panel.classList.add('expanded');
            
            toggleBtn.addEventListener('click', () => {
                if (panel.classList.contains('expanded')) {
                    panel.classList.remove('expanded');
                    panel.classList.add('collapsed');
                } else {
                    panel.classList.remove('collapsed');
                    panel.classList.add('expanded');
                }
            });
        }
    }
    
    initializeAdjustmentsPanel() {
        const toggleBtn = document.getElementById('toggleAdjustmentsPanel');
        const panel = document.getElementById('gridAdjustmentsPanel');
        
        if (toggleBtn && panel) {
            // Start expanded by default
            panel.classList.add('expanded');
            
            toggleBtn.addEventListener('click', () => {
                if (panel.classList.contains('expanded')) {
                    panel.classList.remove('expanded');
                    panel.classList.add('collapsed');
                } else {
                    panel.classList.remove('collapsed');
                    panel.classList.add('expanded');
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
        
        // Find the first selected slot with an image
        let selectedImage = null;
        let selectedSlotIndex = -1;
        
        for (const slotIndex of this.selectedSlots) {
            if (this.gridSlots[slotIndex]) {
                selectedImage = this.gridSlots[slotIndex].image;
                selectedSlotIndex = slotIndex;
                break;
            }
        }
        
        if (selectedImage) {
            // Draw the image to the preview canvas
            const size = 200;
            // Get current adjustment values from controls
            const currentAdjustments = this.getCurrentAdjustments();
            
            // Apply corner radius
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, size, size, currentAdjustments.cornerRadius);
            ctx.clip();
            
            // Draw image
            ctx.drawImage(selectedImage, 0, 0, size, size);
            
            // Apply adjustments if any
            if (currentAdjustments.brightness !== 0 || currentAdjustments.contrast !== 0 || currentAdjustments.saturation !== 0) {
                const imageData = ctx.getImageData(0, 0, size, size);
                const data = imageData.data;
                
                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i];
                    let g = data[i + 1];
                    let b = data[i + 2];
                    
                    // Apply brightness
                    if (currentAdjustments.brightness !== 0) {
                        r += currentAdjustments.brightness;
                        g += currentAdjustments.brightness;
                        b += currentAdjustments.brightness;
                    }
                    
                    // Apply contrast
                    if (currentAdjustments.contrast !== 0) {
                        const factor = (259 * (currentAdjustments.contrast + 255)) / (255 * (259 - currentAdjustments.contrast));
                        r = factor * (r - 128) + 128;
                        g = factor * (g - 128) + 128;
                        b = factor * (b - 128) + 128;
                    }
                    
                    // Apply saturation
                    if (currentAdjustments.saturation !== 0) {
                        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                        const factor = currentAdjustments.saturation / 100;
                        r = gray + factor * (r - gray);
                        g = gray + factor * (g - gray);
                        b = gray + factor * (b - gray);
                    }
                    
                    data[i] = Math.max(0, Math.min(255, r));
                    data[i + 1] = Math.max(0, Math.min(255, g));
                    data[i + 2] = Math.max(0, Math.min(255, b));
                }
                
                ctx.putImageData(imageData, 0, 0);
            }
            
            ctx.restore();
            
            this.previewSlotInfo.textContent = `Slot ${selectedSlotIndex + 1} selected`;
        } else {
            this.previewSlotInfo.textContent = 'No image selected';
        }
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
        
        // Set canvas size for preview (66x66mm at actual PDF resolution)
        const previewSize = 779; // 66mm at 300 DPI
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
        
        // Calculate image positioning to match PDF generation
        const originalWidth = this.currentImage.width;
        const originalHeight = this.currentImage.height;
        
        // Scale to fill image area completely (crop if necessary) - same as PDF
        const imageScale = Math.max(imageSizePixels / originalWidth, imageSizePixels / originalHeight);
        const scaledWidth = originalWidth * imageScale;
        const scaledHeight = originalHeight * imageScale;
        
        // Position to fill image area with no gaps - same as PDF
        const imageOffsetX = userMarginPixels - (scaledWidth - imageSizePixels) / 2;
        const imageOffsetY = userMarginPixels - (scaledHeight - imageSizePixels) / 2;
        
        // Apply adjustments if needed (same logic as PDF generation)
        if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) {
            // Create temporary canvas for adjustments
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = originalWidth;
            tempCanvas.height = originalHeight;
            tempCtx.drawImage(this.currentImage, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, originalWidth, originalHeight);
            this.applyImageFilters(imageData, adjustments);
            tempCtx.putImageData(imageData, 0, 0);
            
            // Apply corner radius and draw to image area
            ctx.save();
            ctx.beginPath();
            const previewCornerRadius = adjustments.cornerRadius * (imageSizePixels / 150);
            ctx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, previewCornerRadius);
            ctx.clip();
            ctx.drawImage(tempCanvas, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
            ctx.restore();
        } else {
            // No adjustments needed - draw directly to image area
            ctx.save();
            ctx.beginPath();
            const previewCornerRadius = adjustments.cornerRadius * (imageSizePixels / 150);
            ctx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, previewCornerRadius);
            ctx.clip();
            ctx.drawImage(this.currentImage, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
            ctx.restore();
        }
        
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
        
        // Set canvas size for A4 preview (actual PDF dimensions at 300 DPI)
        const previewWidth = 2480; // 210mm at 300 DPI
        const previewHeight = 3508; // 297mm at 300 DPI
        canvas.width = previewWidth;
        canvas.height = previewHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, previewWidth, previewHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, previewWidth, previewHeight);
        
        // Calculate badge size in preview (66mm scaled down)
        const badgeSizeMm = 66; // 66x66mm badges
        const scale = previewWidth / 210; // Scale from A4 width (210mm)
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
                
                // Calculate image positioning to match PDF generation
                const originalWidth = slotData.image.width;
                const originalHeight = slotData.image.height;
                
                // Scale to fill image area completely (crop if necessary) - same as PDF
                const imageScale = Math.max(imageSizePixels / originalWidth, imageSizePixels / originalHeight);
                const scaledWidth = originalWidth * imageScale;
                const scaledHeight = originalHeight * imageScale;
                
                // Position to fill image area with no gaps - same as PDF
                const imageOffsetX = userMarginPixels - (scaledWidth - imageSizePixels) / 2;
                const imageOffsetY = userMarginPixels - (scaledHeight - imageSizePixels) / 2;
                
                // Apply adjustments (same logic as PDF generation)
                const adjustments = slotData.adjustments;
                if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) {
                    // Create temporary canvas for adjustments
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = originalWidth;
                    tempCanvas.height = originalHeight;
                    tempCtx.drawImage(slotData.image, 0, 0);
                    
                    const imageData = tempCtx.getImageData(0, 0, originalWidth, originalHeight);
                    this.applyImageFilters(imageData, adjustments);
                    tempCtx.putImageData(imageData, 0, 0);
                    
                    // Apply corner radius and draw to image area
                    ctx.save();
                    ctx.beginPath();
                    const cornerRadius = adjustments.cornerRadius * (imageSizePixels / 150);
                    ctx.roundRect(x + userMarginPixels, y + userMarginPixels, imageSizePixels, imageSizePixels, cornerRadius);
                    ctx.clip();
                    ctx.drawImage(tempCanvas, x + imageOffsetX, y + imageOffsetY, scaledWidth, scaledHeight);
                    ctx.restore();
                } else {
                    // No adjustments needed - draw directly to image area
                    ctx.save();
                    ctx.beginPath();
                    const cornerRadius = adjustments.cornerRadius * (imageSizePixels / 150);
                    ctx.roundRect(x + userMarginPixels, y + userMarginPixels, imageSizePixels, imageSizePixels, cornerRadius);
                    ctx.clip();
                    ctx.drawImage(slotData.image, x + imageOffsetX, y + imageOffsetY, scaledWidth, scaledHeight);
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
                <title>Badge Template Print</title>
                <style>
                    @page {
                        size: ${pageSize};
                        margin: 0;
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
                <img src="${canvasDataURL}" alt="Badge Template">
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
                
                // Draw image to fit canvas with default corner radius
                this.drawImageToCanvas(img, ctx, size, size, 8);
                
                // Store slot data
                this.gridSlots[slotIndex] = {
                    image: img,
                    canvas: canvas,
                    originalData: ctx.getImageData(0, 0, size, size),
                    adjustments: { brightness: 0, contrast: 0, saturation: 0, cornerRadius: 8 }
                };
                
                console.log('Image loaded to slot', slotIndex, 'gridSlots now:', this.gridSlots.map((slot, i) => slot ? `slot${i}:image` : `slot${i}:null`));
                
                // Apply initial corner radius
                this.applyAdjustmentsToSlot(slotIndex, this.gridSlots[slotIndex].adjustments);
                
                // Update slot display
                this.updateSlotDisplay(slotIndex);
                this.updateUI();
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
            // Fill entire canvas (crop if necessary) - for design area
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
        
        // Draw image within clipped area
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
        
        console.log('Selected slots:', Array.from(this.selectedSlots));
        this.updateUI();
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
                    adjustments: { ...sourceImage.adjustments }
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
        
        const maxWidth = 600;
        const maxHeight = 400;
        const imgAspect = this.currentImage.width / this.currentImage.height;
        
        let canvasWidth, canvasHeight;
        if (imgAspect > maxWidth / maxHeight) {
            canvasWidth = maxWidth;
            canvasHeight = maxWidth / imgAspect;
        } else {
            canvasHeight = maxHeight;
            canvasWidth = maxHeight * imgAspect;
        }
        
        this.mainCanvas.width = canvasWidth;
        this.mainCanvas.height = canvasHeight;
        
        if (!this.originalImageData) {
            this.mainCtx.drawImage(this.currentImage, 0, 0, canvasWidth, canvasHeight);
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
    
    // Template drawing methods
    drawTemplate() {
        if (this.currentMode === 'single') {
            this.drawSingleTemplate();
        } else {
            this.updateGridDisplay();
        }
    }
    
    drawSingleTemplate() {
        const canvas = this.templateCanvas;
        const ctx = this.templateCtx;
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

                const originalWidth = this.currentImage.width;
                const originalHeight = this.currentImage.height;

                // Scale to fill image area completely (crop if necessary)
                const scale = Math.max(imageSizePixels / originalWidth, imageSizePixels / originalHeight);
                const scaledWidth = originalWidth * scale;
                const scaledHeight = originalHeight * scale;
                // Position to fill image area with no gaps
                const imageOffsetX = userMarginPixels - (scaledWidth - imageSizePixels) / 2;
                const imageOffsetY = userMarginPixels - (scaledHeight - imageSizePixels) / 2;
                
                // Apply adjustments if needed
                if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
                    // Create temporary canvas for adjustments
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = originalWidth;
                    tempCanvas.height = originalHeight;
                    tempCtx.drawImage(this.currentImage, 0, 0);
                    
                    const imageData = tempCtx.getImageData(0, 0, originalWidth, originalHeight);
                    this.applyImageFilters(imageData, { brightness, contrast, saturation });
                    tempCtx.putImageData(imageData, 0, 0);
                    
                    // Apply corner radius and draw to image area
                    printCtx.save();
                    printCtx.beginPath();
                    const printCornerRadius = cornerRadius * (imageSizePixels / 150);
                    printCtx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, printCornerRadius);
                    printCtx.clip();
                    printCtx.drawImage(tempCanvas, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
                    printCtx.restore();
                } else {
                    // No adjustments needed - draw directly to image area
                    printCtx.save();
                    printCtx.beginPath();
                    const printCornerRadius = cornerRadius * (imageSizePixels / 150);
                    printCtx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, printCornerRadius);
                    printCtx.clip();
                    printCtx.drawImage(this.currentImage, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
                    printCtx.restore();
                }
            }
            
            const imageData = printCanvas.toDataURL('image/png', 1.0); // Use PNG for better quality
            pdf.addImage(imageData, 'PNG', 0, 0, 66, 66);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            pdf.save(`badge-template-${timestamp}.pdf`);
            
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

                    const originalWidth = slotData.image.width;
                    const originalHeight = slotData.image.height;

                    // Scale to fill image area completely (crop if necessary)
                    const scale = Math.max(imageSizePixels / originalWidth, imageSizePixels / originalHeight);
                    const scaledWidth = originalWidth * scale;
                    const scaledHeight = originalHeight * scale;
                    // Position to fill image area with no gaps
                    const offsetX = userMarginPixels - (scaledWidth - imageSizePixels) / 2;
                    const offsetY = userMarginPixels - (scaledHeight - imageSizePixels) / 2;
                    
                    // Apply adjustments
                    const adjustments = slotData.adjustments;
                    if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) {
                        // Create temporary canvas for adjustments
                        const tempCanvas = document.createElement('canvas');
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCanvas.width = originalWidth;
                        tempCanvas.height = originalHeight;
                        tempCtx.drawImage(slotData.image, 0, 0);
                        
                        const imageData = tempCtx.getImageData(0, 0, originalWidth, originalHeight);
                        this.applyImageFilters(imageData, adjustments);
                        tempCtx.putImageData(imageData, 0, 0);
                        
                        // Apply corner radius and draw to image area
                        badgeCtx.save();
                        badgeCtx.beginPath();
                        const cornerRadius = adjustments.cornerRadius * (imageSizePixels / 150);
                        badgeCtx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, cornerRadius);
                        badgeCtx.clip();
                        badgeCtx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
                        badgeCtx.restore();
                    } else {
                        // No adjustments needed - draw directly to image area
                        badgeCtx.save();
                        badgeCtx.beginPath();
                        const cornerRadius = adjustments.cornerRadius * (imageSizePixels / 150);
                        badgeCtx.roundRect(userMarginPixels, userMarginPixels, imageSizePixels, imageSizePixels, cornerRadius);
                        badgeCtx.clip();
                        badgeCtx.drawImage(slotData.image, offsetX, offsetY, scaledWidth, scaledHeight);
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
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            pdf.save(`badge-grid-${timestamp}.pdf`);
            
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
});