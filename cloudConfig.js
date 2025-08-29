
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUD_API_KEY,
    api_secret:process.env.CLOUD_API_SECRET,
});

// Force ALL files to be uploaded as raw files - this ensures PDFs work properly
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Health',
    allowedFormats: ["png","jpg","jpeg","pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"],
  },
});

module.exports = {
  cloudinary,
  storage
};