const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const imageUrl = 'https://svs.gsfc.nasa.gov/vis/a030000/a030800/a030877/frames/5760x3240_16x9_01p/BlackMarble_2016_928m_russia_west_labeled.png'; // Replace with your image URL
const outputFolder = 'output'; // Folder where the converted image will be saved

// Ensure the output folder exists
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder);
}

// Function to get the next sequential filename
function getNextFileName(folder) {
  // Get all the files in the output folder
  const files = fs.readdirSync(folder);

  // Filter out WebP files that match the pattern 'output-image-X.webp'
  const webpFiles = files
    .filter(file => file.startsWith('output-image-') && file.endsWith('.webp'))
    .map(file => parseInt(file.split('-')[2])); // Extract the number part

  // Find the highest number and increment it by 1
  const nextNumber = webpFiles.length > 0 ? Math.max(...webpFiles) + 1 : 1;

  return `output-image-${nextNumber}.webp`;
}

// Function to download image and convert it to WebP with high quality and dynamic resizing
async function convertImageToWebp(url, folder, resizeRatio = 1) {
  try {
    // Fetch the image from the provided URL
    const response = await axios({
      url,
      responseType: 'arraybuffer', // Fetches the image as binary data
    });

    // Get the next available file name
    const outputImagePath = path.join(folder, getNextFileName(folder));

    // Convert the image to WebP format with lossless compression for PNG and high quality for JPEG
    const image = sharp(response.data);
    const metadata = await image.metadata();

    // Dynamically resize the image based on the original dimensions
    const newWidth = Math.round(metadata.width * resizeRatio);
    const newHeight = Math.round(metadata.height * resizeRatio);

    if (metadata.format === 'png') {
      // For PNG images, use lossless compression
      await image
        .resize(newWidth, newHeight, { fit: sharp.fit.inside }) // Preserve aspect ratio
        .webp({ lossless: true }) // Enable lossless for PNG
        .toFile(outputImagePath);
    } else if (metadata.format === 'jpeg') {
      // For JPEG images, use high-quality compression
      await image
        .resize(newWidth, newHeight, { fit: sharp.fit.inside }) // Preserve aspect ratio
        .webp({ quality: 100 }) // Max quality for JPEG
        .toFile(outputImagePath);
    } else {
      // Default to high quality if format is unknown
      await image
        .resize(newWidth, newHeight, { fit: sharp.fit.inside }) // Preserve aspect ratio
        .webp({ quality: 100 })
        .toFile(outputImagePath);
    }

    console.log(`Image converted and saved as: ${outputImagePath}`);
    console.log(`New dimensions: ${newWidth}x${newHeight}`);
  } catch (error) {
    console.error('Error converting image:', error);
  }
}

// Call the function with the image URL and dynamic resize ratio
const resizeRatio = 1; // For example, resize to 50% of the original size
convertImageToWebp(imageUrl, outputFolder, resizeRatio);
