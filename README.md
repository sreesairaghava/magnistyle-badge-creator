# Badge Template Creator

A professional web application for creating print-ready badge templates with precise dimensions and CMYK color output. Features both single badge creation and A4 grid layout for batch production.

## Features

### 🖼️ Image Management
- **Dual Mode Interface**: Switch between Single Badge and A4 Grid (12 badges) modes
- **Drag & Drop Upload**: Simply drag images onto upload zones or click to browse
- **Multiple Format Support**: Works with JPG, PNG, GIF, and other common image formats
- **Batch Upload**: Upload multiple images at once in grid mode
- **Responsive Interface**: Clean, modern UI that works on desktop and mobile

### ✂️ Image Editing
- **Free-form Cropping**: Interactive crop tool with resizable handles (single mode)
- **Brightness/Contrast**: Real-time adjustment sliders
- **Saturation Control**: Enhance or reduce color intensity
- **Batch Processing**: Apply adjustments to selected badges or all badges at once
- **Individual Control**: Each badge can have unique adjustments
- **Non-destructive Editing**: All adjustments preserve original image data

### 📐 Template System
- **Precise Dimensions**: 
  - Design Area: 50×50mm
  - Badge Size: 50×50mm
  - Die Cut: 61×61mm
  - Rotary Cut with Margin: 66×66mm
- **Visual Guides**: Toggle-able cut guides with customizable opacity
- **Live Preview**: Real-time template preview with proper scaling
- **A4 Grid Layout**: Professional 3×4 grid arrangement for batch printing

### 🎯 Grid Management
- **12-Slot Grid**: Optimized 3×4 layout for A4 printing
- **Visual Selection**: Click to select badges, Ctrl+click for multi-select
- **Drag & Drop Reordering**: Rearrange badges by dragging between slots
- **Fill Empty Slots**: Duplicate existing images to fill empty positions
- **Clear All**: Quick reset for starting fresh
- **Individual Slot Controls**: Remove or replace specific badges

### 🖨️ Print-Ready Output
- **300 DPI Resolution**: Professional print quality
- **CMYK Color Space**: Optimized for inkjet printing
- **Dual PDF Options**: Single badge (50×50mm) or A4 grid (210×297mm)
- **Optional Cut Guides**: Toggle guides on/off for final print
- **Proper Margins**: Includes all necessary margins for professional printing

## How to Use

### Getting Started
1. **Open the Application**
   - Open `index.html` in any modern web browser
   - No installation or server setup required

2. **Choose Your Mode**
   - **Single Badge**: Create one badge at a time with detailed editing
   - **A4 Grid**: Create up to 12 badges for batch printing

### Single Badge Mode
1. **Upload Your Image**
   - Drag and drop an image onto the upload zone, or
   - Click the upload zone to browse and select an image

2. **Edit Your Image**
   - **Crop Tool**: Click "Enable Crop" for interactive cropping
     - Drag the crop box to reposition
     - Use corner/edge handles to resize
     - Click "Apply Crop" when satisfied
   - **Adjustments**: Use sliders for brightness, contrast, and saturation
   - **Reset**: Return to original settings anytime

3. **Configure Template**
   - Toggle "Show Cut Guides" to see cutting areas
   - Adjust "Template Opacity" for guide visibility
   - Monitor live preview on the right

4. **Download Single PDF**
   - Click "Download PDF" for a 50×50mm print-ready file

### A4 Grid Mode
1. **Upload Images**
   - Drag multiple images to the upload zone, or
   - Click to browse and select multiple files
   - Images automatically fill empty slots in order

2. **Manage Your Grid**
   - **Select Badges**: Click to select, Ctrl+click for multiple selection
   - **Rearrange**: Drag badges between slots to reorder
   - **Remove**: Use the × button on each badge
   - **Fill Empty**: Duplicate first image to all empty slots
   - **Clear All**: Start over with empty grid

3. **Batch Editing**
   - Adjust brightness, contrast, saturation with sliders
   - **Apply to Selected**: Apply changes only to selected badges
   - **Apply to All**: Apply changes to all badges in grid
   - Each badge maintains individual settings

4. **Configure Grid**
   - Toggle "Show Grid Guides (A4)" for cutting guides on PDF
   - Adjust opacity for better visibility
   - Monitor selection count in header

5. **Download A4 PDF**
   - Click "Download A4 PDF" for complete sheet
   - Includes optional cutting guides
   - Optimized for professional printing

## Technical Specifications

### Dimensions (at 300 DPI)
- Design Area: 590×590 pixels (50×50mm)
- Badge Size: 590×590 pixels (50×50mm)
- Die Cut: 720×720 pixels (61×61mm)
- Rotary Cut: 779×779 pixels (66×66mm)

### Print Settings
- **Resolution**: 300 DPI
- **Color Mode**: CMYK optimized
- **Format**: PDF
- **Quality**: High (95% JPEG compression)

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## File Structure

```
/
├── index.html          # Main application interface
├── styles.css          # Complete styling and responsive design
├── app.js             # Core application logic
└── README.md          # This documentation
```

## Features in Detail

### Interactive Cropping
The crop tool provides professional-grade cropping capabilities:
- **8-handle resize system**: Corner and edge handles for precise control
- **Drag to move**: Click and drag the crop area to reposition
- **Real-time preview**: See changes immediately in the template preview
- **Minimum size constraints**: Prevents accidentally creating unusably small crops

### Image Processing
All image adjustments are applied using HTML5 Canvas:
- **Brightness**: -100 to +100 range with real-time preview
- **Contrast**: Professional contrast curve adjustment
- **Saturation**: Enhance or desaturate colors while preserving luminance
- **Non-destructive**: Original image data is preserved for reset functionality

### Template Visualization
The template system shows all cutting layers:
- **Red**: Design area (your actual content)
- **Orange**: Badge boundary
- **Green**: Die cut area
- **Blue**: Rotary cut with margins

## Printing Guidelines

For best results when printing:

1. **Printer Settings**:
   - Use highest quality/photo mode
   - Select CMYK or "Vivid Colors" if available
   - Use premium photo paper or cardstock

2. **File Handling**:
   - Download the PDF and print directly
   - Do not resize or modify the PDF
   - Print at 100% scale (no fit-to-page)

3. **Paper Recommendations**:
   - 200-300 GSM cardstock for durability
   - Glossy or matte finish based on preference
   - Ensure paper size accommodates 66×66mm dimensions

## Troubleshooting

**Image not loading**: Ensure your image file is under 10MB and in a supported format (JPG, PNG, GIF)

**Crop tool not working**: Make sure you've clicked "Enable Crop" first and that an image is loaded

**PDF download fails**: Check that you have sufficient browser permissions for downloads and that the image is properly loaded

**Print quality issues**: Ensure you're using the PDF file directly and printing at 100% scale with high-quality settings

## Support

This is a standalone web application that runs entirely in your browser. No data is transmitted to external servers, ensuring your images remain private and secure.

For best performance, use the latest version of Chrome, Firefox, or Safari.
