const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary
 * @param {String} filePath - Path to the file
 * @param {String} folder - Folder name in Cloudinary
 * @returns {Object} Upload result
 */
const uploadToCloudinary = async (filePath, folder = 'uploads') => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: false,
    });

    // Remove local file after upload
    fs.unlinkSync(filePath);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (error) {
    // Remove local file if upload failed
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file paths
 * @param {String} folder - Folder name in Cloudinary
 * @returns {Array} Array of upload results
 */
const uploadMultipleToCloudinary = async (files, folder = 'uploads') => {
  try {
    const uploadPromises = files.map(filePath => uploadToCloudinary(filePath, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    throw new Error(`Multiple upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Public ID of the file
 * @returns {Object} Delete result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array} publicIds - Array of public IDs
 * @returns {Array} Array of delete results
 */
const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteFromCloudinary(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    throw new Error(`Multiple delete failed: ${error.message}`);
  }
};

/**
 * Get Cloudinary image URL with transformations
 * @param {String} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {String} Transformed URL
 */
const getImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: options.width || 500,
    height: options.height || 500,
    crop: options.crop || 'fill',
    quality: options.quality || 'auto',
    format: options.format || 'auto',
  };

  return cloudinary.url(publicId, defaultOptions);
};

/**
 * Upload file from buffer (for in-memory files)
 * @param {Buffer} buffer - File buffer
 * @param {String} folder - Folder name
 * @param {String} fileName - Original file name
 * @returns {Object} Upload result
 */
const uploadFromBuffer = async (buffer, folder = 'uploads', fileName = 'file') => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
          public_id: fileName.split('.')[0],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              width: result.width,
              height: result.height,
              bytes: result.bytes,
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    throw new Error(`Buffer upload failed: ${error.message}`);
  }
};

/**
 * Check if URL is a Cloudinary URL
 * @param {String} url - URL to check
 * @returns {Boolean} True if Cloudinary URL
 */
const isCloudinaryUrl = (url) => {
  if (!url) return false;
  return url.includes('res.cloudinary.com');
};

/**
 * Extract public ID from Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @returns {String} Public ID
 */
const extractPublicId = (url) => {
  if (!isCloudinaryUrl(url)) return null;
  
  const matches = url.match(/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  if (matches && matches[1]) {
    return matches[1];
  }
  return null;
};

/**
 * Generate image URL with transformations
 * @param {Object} options - Image options
 * @returns {String} Optimized image URL
 */
const generateOptimizedImageUrl = (options) => {
  const {
    publicId,
    url,
    width = 800,
    height = 600,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto',
    effect = null,
  } = options;

  const id = publicId || extractPublicId(url);
  if (!id) return url || '';

  const transformations = {
    width,
    height,
    crop,
    quality,
    format,
    gravity,
  };

  if (effect) {
    transformations.effect = effect;
  }

  return cloudinary.url(id, transformations);
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getImageUrl,
  uploadFromBuffer,
  isCloudinaryUrl,
  extractPublicId,
  generateOptimizedImageUrl,
};