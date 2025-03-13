// src/pages/api/upload.js
import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';

// Configure formidable for file parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

// Parse form data
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

// Upload file to Pinata
const uploadToPinata = async (filePath) => {
  try {
    // Read the file
    const fileData = fs.readFileSync(filePath);
    
    // Create form data for Pinata
    const formData = new FormData();
    formData.append('file', new Blob([fileData]));
    
    // Add metadata
    const metadata = JSON.stringify({
      name: `SolSocial-${Date.now()}`,
      keyvalues: {
        app: 'SolSocial',
        timestamp: Date.now().toString(),
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);
    
    // Get API keys from environment variables
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
    
    if (!pinataApiKey || !pinataSecretApiKey) {
      throw new Error('Pinata API keys not configured');
    }
    
    // Make request to Pinata API
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
      }
    );
    
    if (response.status === 200) {
      // Return the IPFS gateway URL for easy access
      // You can use any public IPFS gateway
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } else {
      throw new Error('Failed to upload to Pinata');
    }
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const { files } = await parseForm(req);
    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed' });
    }

    // Upload to Pinata
    const url = await uploadToPinata(file.filepath);

    // Return the URL
    return res.status(200).json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}