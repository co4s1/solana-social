// src/pages/api/upload.js
import formidable from 'formidable';
import Arweave from 'arweave';
import fs from 'fs';
import path from 'path';

// Configure formidable for file parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Arweave client
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
});

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

// Upload file to Arweave
const uploadToArweave = async (filePath) => {
  try {
    // Read the file
    const fileData = fs.readFileSync(filePath);
    
    // Get JWK from environment variable
    // WARNING: In production, you should use a more secure method for storing keys
    const jwk = JSON.parse(process.env.ARWEAVE_KEY);
    
    // Create transaction
    const transaction = await arweave.createTransaction({ data: fileData }, jwk);
    
    // Add tags to identify the file
    transaction.addTag('Content-Type', 'image/jpeg');
    transaction.addTag('App-Name', 'SolSocial');
    
    // Sign the transaction
    await arweave.transactions.sign(transaction, jwk);
    
    // Submit transaction
    const response = await arweave.transactions.post(transaction);
    
    if (response.status === 200 || response.status === 202) {
      return `https://arweave.net/${transaction.id}`;
    } else {
      throw new Error('Failed to upload to Arweave');
    }
  } catch (error) {
    console.error('Arweave upload error:', error);
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

    // Upload to Arweave
    const url = await uploadToArweave(file.filepath);

    // Return the URL
    return res.status(200).json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}