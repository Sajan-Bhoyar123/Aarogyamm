const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Healthare_System',
    // Set resource_type to 'auto' to let Cloudinary handle file types correctly
    resource_type: 'auto', 
    // Corrected typo from "allowerdFormats" to "allowedFormats" and removed duplicates
    allowedFormats: ["png", "jpg", "jpeg", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"],
  },
});

module.exports = { cloudinary, storage };