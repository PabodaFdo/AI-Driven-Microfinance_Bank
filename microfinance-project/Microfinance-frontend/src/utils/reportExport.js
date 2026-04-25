import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Export report content to PDF
 * @param {HTMLElement} element - The report container element to export
 * @param {Object} options - Export options
 * @param {string} options.fileName - Name for the PDF file
 * @param {string} options.title - Report title
 * @param {string} options.filterSummary - Summary of applied filters
 */
export const exportReportToPDF = async (element, options = {}) => {
  if (!element) {
    throw new Error('Element to export is required');
  }

  const { 
    fileName = 'report.pdf', 
    title = 'Report', 
    filterSummary = '' 
  } = options;

  try {
    // Add temporary styles for better PDF rendering
    const originalStyles = [];
    const elementsToStyle = element.querySelectorAll('*');
    
    elementsToStyle.forEach((el) => {
      originalStyles.push({
        element: el,
        color: el.style.color,
        backgroundColor: el.style.backgroundColor
      });
      
      // Convert dark theme to light for PDF
      if (el.style.color === 'rgb(255, 255, 255)' || el.style.color === 'white') {
        el.style.color = '#333333';
      }
      if (el.style.backgroundColor === 'rgb(31, 41, 55)' || 
          el.style.backgroundColor === 'rgb(17, 24, 39)') {
        el.style.backgroundColor = '#ffffff';
      }
    });

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight
    });

    // Restore original styles
    originalStyles.forEach(({ element, color, backgroundColor }) => {
      element.style.color = color;
      element.style.backgroundColor = backgroundColor;
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    
    // Calculate image dimensions
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    
    // Add content to PDF
    let yPosition = margin;
    
    // Add title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPosition);
    yPosition += 10;
    
    // Add generation date
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 8;
    
    // Add filter summary if provided
    if (filterSummary) {
      pdf.text(`Filters: ${filterSummary}`, margin, yPosition);
      yPosition += 8;
    }
    
    yPosition += 5;
    
    // Check if image fits on current page
    if (yPosition + imgHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
    
    // Add the report image
    pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
    
    // Save the PDF
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Failed to export PDF: ' + error.message);
  }
};

/**
 * Print report content
 * @param {HTMLElement} element - The report container element to print
 * @param {Object} options - Print options
 * @param {string} options.title - Report title
 * @param {string} options.filterSummary - Summary of applied filters
 */
export const printReport = (element, options = {}) => {
  if (!element) {
    throw new Error('Element to print is required');
  }

  const { title = 'Report', filterSummary = '' } = options;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check your popup blocker settings.');
  }

  // Get the report content HTML
  const reportHTML = element.outerHTML;
  
  // Create the print document
  const printDocument = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          color: #333;
          background: white;
          padding: 20px;
          line-height: 1.4;
        }
        
        .print-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        
        .print-header h1 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #333;
        }
        
        .print-header p {
          font-size: 14px;
          margin-bottom: 5px;
        }
        
        .printable-report-content {
          width: 100%;
        }
        
        .report-header {
          margin-bottom: 20px;
        }
        
        .print-only {
          display: block !important;
        }
        
        .screen-only {
          display: none !important;
        }
        
        .reporting-grid {
          display: grid;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .reporting-grid-kpi {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
        
        .reporting-grid-two {
          grid-template-columns: 1fr 1fr;
        }
        
        .reporting-kpi-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          background: #f9f9f9;
          text-align: center;
        }
        
        .reporting-kpi-title {
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
          text-transform: capitalize;
        }
        
        .reporting-kpi-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        
        .reporting-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          background: #f9f9f9;
        }
        
        .reporting-panel h3 {
          margin-bottom: 15px;
          color: #333;
          font-size: 18px;
        }
        
        .reporting-chart-wrap {
          height: 300px;
          position: relative;
        }
        
        canvas {
          max-width: 100% !important;
          height: auto !important;
        }
        
        @media print {
          body { 
            margin: 0;
            padding: 15px;
          }
          
          .reporting-chart-wrap {
            height: 250px;
          }
          
          .reporting-grid-two {
            grid-template-columns: 1fr;
          }
          
          .reporting-panel {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        ${filterSummary ? `<p>Filters: ${filterSummary}</p>` : ''}
      </div>
      ${reportHTML}
    </body>
    </html>
  `;
  
  // Write the document and print
  printWindow.document.write(printDocument);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};