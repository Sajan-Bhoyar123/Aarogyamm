const { cloudinary } = require('../cloudConfig.js');

/**
 * Ensures proper URL generation for different file types
 * @param {string} filePath - The file path from multer
 * @returns {string} - Properly formatted URL for the file
 */
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  
  // If it's already a Cloudinary URL, return as is
  if (filePath.includes('cloudinary.com')) {
    return filePath;
  }
  
  // If it's a local file path, you might need to handle it differently
  return filePath;
};

/**
 * Determines if a file is a document (PDF, DOC, etc.) or an image
 * @param {string} filePath - The file path or URL
 * @returns {boolean} - True if it's a document, false if it's an image
 */
const isDocument = (filePath) => {
  if (!filePath) return false;
  
  const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
  const fileExtension = filePath.split('.').pop().toLowerCase();
  
  return documentExtensions.includes(`.${fileExtension}`);
};

/**
 * Generates a proper download URL for Cloudinary files
 * @param {string} cloudinaryUrl - The Cloudinary URL
 * @returns {string} - URL optimized for download
 */
const getDownloadUrl = (cloudinaryUrl) => {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
    return cloudinaryUrl;
  }
  
  // For documents, we want to ensure they're served as raw files
  if (isDocument(cloudinaryUrl)) {
    // Add fl_attachment parameter to force download
    return cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
  }
  
  return cloudinaryUrl;
};

module.exports = {
  getFileUrl,
  isDocument,
  getDownloadUrl
}; 