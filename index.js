const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express'); // Import Express
const app = express(); // Initialize Express
const port = 3000; // Define the port

app.use(express.json()); // Middleware to parse JSON request bodies

const outputFolder = 'output'; // Folder where the converted image will be saved

// Ensure the output folder exists
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder);
}

// Function to get the next sequential filename
function getNextFileName(folder) {
  const files = fs.readdirSync(folder);
  const webpFiles = files
    .filter(file => file.startsWith('output-image-') && file.endsWith('.webp'))
    .map(file => parseInt(file.split('-')[2])); // Extract the number part

  const nextNumber = webpFiles.length > 0 ? Math.max(...webpFiles) + 1 : 1;
  return `output-image-${nextNumber}.webp`;
}

// Function to download image and convert it to WebP with high quality and dynamic resizing
async function convertImageToWebp(url, folder, resizeRatio = 1) {
  try {
    const response = await axios({
      url,
      responseType: 'arraybuffer',
    });

    const outputImagePath = path.join(folder, getNextFileName(folder));
    const image = sharp(response.data);
    const metadata = await image.metadata();

    const newWidth = Math.round(metadata.width * resizeRatio);
    const newHeight = Math.round(metadata.height * resizeRatio);

    if (metadata.format === 'png') {
      await image
        .resize(newWidth, newHeight, { fit: sharp.fit.inside })
        .webp({ lossless: true })
        .toFile(outputImagePath);
    } else if (metadata.format === 'jpeg') {
      await image
        .resize(newWidth, newHeight, { fit: sharp.fit.inside })
        .webp({ quality: 100 })
        .toFile(outputImagePath);
    } else {
      await image
        .resize(newWidth, newHeight, { fit: sharp.fit.inside })
        .webp({ quality: 100 })
        .toFile(outputImagePath);
    }

    console.log(`Image converted and saved as: ${outputImagePath}`);
    console.log(`New dimensions: ${newWidth}x${newHeight}`);

    return { 
      success: true, 
      message: 'Image converted successfully', 
      path: outputImagePath, 
      dimensions: { width: newWidth, height: newHeight } // Return dimensions
    };
  } catch (error) {
    console.error('Error converting image:', error);
    return { success: false, error: error.message };
  }
}

// API endpoint to accept imageUrl and resizeRatio from Postman
app.post('/convert-image', async (req, res) => {
  const { imageUrl, resizeRatio } = req.body;

  // Check if imageUrl and resizeRatio are provided
  if (!imageUrl || !resizeRatio) {
    return res.status(400).json({ success: false, message: 'imageUrl and resizeRatio are required.' });
  }

  // Call the convertImageToWebp function
  const result = await convertImageToWebp(imageUrl, outputFolder, parseFloat(resizeRatio));

  if (result.success) {
    res.json({ 
      success: true, 
      message: result.message, 
      path: result.path, 
      dimensions: result.dimensions // Include dimensions in the response
    });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
