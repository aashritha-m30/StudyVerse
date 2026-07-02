/*
   StudyVerse Document Processor Module
   Handles client-side file reading, PDF parsing via pdf.js, 
   and note management.
*/

// Initialize PDF.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

/**
 * Extracts text content from a PDF file using PDF.js
 * @param {File} file 
 * @returns {Promise<string>} parsed text
 */
export async function parsePDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      const typedarray = new Uint8Array(e.target.result);
      
      try {
        const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += `--- Page ${i} ---\n` + pageText + '\n\n';
        }
        
        if (!fullText.trim()) {
          reject(new Error("No readable text found in PDF. It might be scanned or image-only."));
        } else {
          resolve(fullText);
        }
      } catch (err) {
        console.error("PDF.js parsing error: ", err);
        reject(new Error("Failed to parse PDF. The file may be corrupted."));
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file buffer."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Reads a raw text or markdown file
 * @param {File} file 
 * @returns {Promise<string>} text content
 */
export async function parseTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read text file."));
    reader.readAsText(file);
  });
}

/**
 * Formats bytes to human-readable size
 * @param {number} bytes 
 * @returns {string} formatted size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
