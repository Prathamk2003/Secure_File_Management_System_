const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const xlsx = require('xlsx');
const csvParse = require('csv-parse/sync');
const PPTX2Json = require('pptx2json');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph } = require('docx');
const AdmZip = require('adm-zip');
const AuditLog = require('./models/AuditLog');
const crypto = require('crypto');
const https = require('https');
const archiver = require('archiver');
const unzipper = require('unzipper');
const {
  triggerNotification,
  getNotifications,
  clearNotifications,
  updateNotificationStatus
} = require('./notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// Add CORS middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from your frontend development server
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure the uploads directory exists
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Define allowed file types
const allowedFileTypes = {
  // Documents
  'application/pdf': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'application/vnd.ms-excel.sheet.macroEnabled.12': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'application/vnd.ms-powerpoint': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
  'text/plain': true,
  // CSV files
  'text/csv': true,
  'application/csv': true,
  'application/x-csv': true,
  'text/x-csv': true,
  'text/comma-separated-values': true,
  // Images
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  // Others
  'application/zip': true,
  'application/x-zip-compressed': true,
  'application/x-dwg': true,
  'application/octet-stream': true // For scanned docs and patents
};

const fileFilter = (req, file, cb) => {
  // Log the file information for debugging
  console.log('File being uploaded:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Check if the file type is allowed
  if (allowedFileTypes[file.mimetype]) {
    cb(null, true);
  } else {
    // Log the rejected file type
    console.log('Rejected file type:', file.mimetype);
    cb(new Error(`Invalid file type: ${file.mimetype}. Only specific document, image, and other file types are allowed.`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Middleware to parse JSON bodies (for other routes)
app.use(express.json());

// Middleware to parse text bodies (specifically for the edit route)
app.use(express.text());

console.log('Registering routes...');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/secure_file_manager', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Routes
// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the user
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, mfaToken } = req.body; // Accept mfaToken

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if MFA is enabled for the user
    if (user.mfaSecret) {
      // If MFA is enabled, check for the MFA token
      if (!mfaToken) {
        // If no token is provided, request it
        // Use a specific status code or message to indicate MFA is required
        return res.status(401).json({ message: 'MFA required.', requiresMfa: true });
      }

      // Verify the MFA token
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaToken,
        window: 1, // Allow a time skew of 1 time step
      });

      if (!verified) {
        // If token is invalid
        return res.status(401).json({ message: 'Invalid MFA token.' });
      }
      // If token is valid, proceed with login
    }

    // If MFA is not enabled or token is valid, login is successful
    // In a real application, you would generate and send a JWT here
    res.status(200).json({ message: 'User logged in successfully', userId: user._id });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // User not found, but send a generic success message to prevent email enumeration
      return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    // In a real application, generate a reset token and send an email here.
    // For demonstration, we'll just send a success message.
    console.log(`Password reset requested for email: ${email}`);

    res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// MFA Verify Token
// TODO: Integrate this into the login flow after successful username/password authentication
app.post('/api/mfa/verify', async (req, res) => {
  // In a real application, get the user ID or email from the partially authenticated session
  // For now, assuming user identifier and token are sent in the body for demonstration (NOT SECURE)
  const { email, token } = req.body; // Replace with authenticated user identifier and token

  if (!email || !token) {
    return res.status(400).json({ message: 'Email and token are required.' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if user has MFA enabled
    if (!user.mfaSecret) {
      return res.status(400).json({ message: 'MFA is not enabled for this user.' });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 1, // Allow a time skew of 1 time step (30 seconds)
    });

    if (verified) {
      // Token is valid
      // In a real application, grant the user full access/session here
      res.status(200).json({ message: 'MFA token verified successfully.' });
    } else {
      // Token is invalid
      res.status(401).json({ message: 'Invalid MFA token.' });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// MFA Setup - Generate Secret and QR code
// TODO: Add authentication middleware to protect this route
app.post('/api/mfa/setup', async (req, res) => {
  // In a real application, get the user ID from the authenticated request
  // For now, assuming user identifier is sent in the body for demonstration (NOT SECURE)
  const { userId } = req.body; // Replace with authenticated user ID

  console.log('MFA Setup: Received request for userId:', userId); // Log received userId

  if (!userId) {
    console.log('MFA Setup: userId is missing.'); // Log missing userId
    return res.status(400).json({ message: 'User ID is required.' }); // Temporary check
  }

  try {
    console.log('MFA Setup: Attempting to find user with ID:', userId); // Log before finding user
    const user = await User.findById(userId); // Find user by ID
    console.log('MFA Setup: Found user:', user); // Log if user is found (will be null if not)

    if (!user) {
      console.log('MFA Setup: User not found with ID:', userId); // Log if user not found
      return res.status(404).json({ message: 'User not found.' });
    }

    console.log('MFA Setup: Generating secret for user:', user.email); // Log before generating secret
    // Generate a new secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: 'SecureVault', // Application name
      account: user.email, // User's email or identifier
    });
    console.log('MFA Setup: Generated secret.'); // Log after generating secret

    // Store the secret in the user's document
    user.mfaSecret = secret.base32;
    console.log('MFA Setup: Saving user with new secret.'); // Log before saving
    await user.save();
    console.log('MFA Setup: User saved.'); // Log after saving

    console.log('MFA Setup: Generating QR code for URL:', secret.otpauth_url); // Log before generating QR code
    // Generate QR code URL
    qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
      if (err) {
        console.error('MFA Setup: Error generating QR code:', err); // Log QR code error object
        return res.status(500).json({ message: 'Error generating QR code.' });
      }
      console.log('MFA Setup: QR code generated.'); // Log after QR code generated
      res.status(200).json({ secret: secret.base32, qrCodeUrl: dataUrl });
    });

  } catch (err) {
    console.error('MFA Setup: Caught an error:', err); // Log the full error object in catch block
    res.status(500).send('Server Error');
  }
});

// Encryption setup
const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
const IV_LENGTH = 16;

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]); // prepend IV for later decryption
}

function decryptBuffer(buffer) {
  const iv = buffer.slice(0, IV_LENGTH);
  const encryptedText = buffer.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
}

// Tamper-proof log creation
async function createTamperProofLog(logData) {
  // Get the last log entry
  const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
  const prevHash = lastLog ? lastLog.hash : '';
  const logString = JSON.stringify({ ...logData, prevHash });
  const hash = crypto.createHash('sha256').update(logString).digest('hex');
  const logEntry = { ...logData, prevHash, hash };
  return AuditLog.create(logEntry);
}

// File Upload Route
app.post('/api/upload', upload.single('file'), async (req, res) => {
  console.log('Received file upload request');
  if (!req.file) {
    console.error('Multer failed to process file or no file received.', req.body);
    return res.status(400).send('No file uploaded or Multer error.');
  }
  console.log('File processed by Multer:', req.file);
  // Access title and description from the request body
  const { title, description, userId } = req.body; // Include userId here
  console.log('Received Title:', title);
  console.log('Received Description:', description);
  console.log('Received UserId:', userId); // Log the received userId

  // File uploaded successfully. req.file contains information about the uploaded file.

  // Save metadata to a JSON file
  const metadataFilename = `${req.file.filename}.metadata.json`;
  const metadataFilePath = path.join('uploads/', metadataFilename);
  const metadata = {
    title: title || req.file.originalname, // Use original name as default title if none provided
    description: description || '',
    ownerId: userId // Save the owner's user ID
  };

  fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), (err) => {
    if (err) {
      console.error('Error saving metadata file:', err);
      // Continue even if metadata saving fails, the file is still uploaded
    } else {
      console.log('Metadata file saved:', metadataFilename);
    }
  });

  // Encrypt the file before saving
  const filePath = req.file.path;
  const fileBuffer = await fs.promises.readFile(filePath);
  const encryptedBuffer = encryptBuffer(fileBuffer);
  await fs.promises.writeFile(filePath, encryptedBuffer);

  // Add this after saving the file and metadata:
  await createTamperProofLog({
    action: 'File Uploaded',
    file: req.file.filename,
    user: req.body.userId || 'Unknown',
    ip: req.ip,
    status: 'success'
  });

  triggerNotification(
    'file_uploaded',
    `File uploaded: ${req.file.originalname} by user ${req.body.userId || 'Unknown'}`
  );

  res.status(200).json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// Get Files Endpoint
app.get('/api/files', async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, 'uploads');
    const files = await fs.promises.readdir(uploadDir);
    const fileList = [];

    // Collect all unique ownerIds
    const ownerIdsSet = new Set();

    for (const file of files) {
      if (file.endsWith('.metadata.json')) continue;
      const metadataPath = path.join(uploadDir, `${file}.metadata.json`);
      let metadata = {};
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
        if (metadata.ownerId && metadata.ownerId !== 'dummy-user-id') {
          ownerIdsSet.add(metadata.ownerId);
        }
      }
      const stat = await fs.promises.stat(path.join(uploadDir, file));
      fileList.push({
        name: file,
        ...metadata,
        modified: stat.mtime,
        size: (stat.size / 1024).toFixed(2), // Size in KB, rounded to 2 decimals
        type: path.extname(file).replace('.', '').toUpperCase(), // <-- Add comma before this line
        owner: metadata.ownerId || 'Unknown',
        status: 'secure', // or your logic
      });
    }

    // Fetch user names for these IDs
    const ownerIds = Array.from(ownerIdsSet);
    const users = await User.find({ _id: { $in: ownerIds } }, '_id name');
    const userMap = {};
    users.forEach(u => { userMap[u._id] = u.name; });

    // Attach ownerName to each file
    const filesWithOwnerName = fileList.map(file => ({
      ...file,
      ownerName: userMap[file.owner] || (file.owner === 'Unknown' ? 'Unknown' : file.owner)
    }));

    res.json(filesWithOwnerName);
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// File Download Endpoint
app.get('/api/files/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  try {
    const encryptedBuffer = await fs.promises.readFile(filePath);
    const decryptedBuffer = decryptBuffer(encryptedBuffer);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(decryptedBuffer);

    triggerNotification(
      'file_downloaded',
      `File downloaded: ${filename}` // Consider adding user info if available in req
    );

  } catch (err) {
    res.status(500).send('Error downloading file.');
  }
});

// File Delete Endpoint
app.delete('/api/files/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  try {
    await fs.promises.unlink(filePath);
    console.log(`File ${filename} deleted successfully.`);

    triggerNotification(
      'file_deleted',
      `File deleted: ${filename}` // Consider adding user info if available in req
    );

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error(`Error deleting file ${filename}:`, err);
    if (err.code === 'ENOENT') {
      res.status(404).send('File not found.');
    } else {
      res.status(500).send('Error deleting file.');
    }
  }
});

// File View Endpoint (basic - for text, images, and Excel)
app.get('/api/view/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  const ext = path.extname(filename).toLowerCase().replace('.', '');

  try {
    // Read and decrypt the file buffer first
    const encryptedBuffer = await fs.promises.readFile(filePath);
    const buffer = decryptBuffer(encryptedBuffer);

    // Handle Excel files
    if (["xlsx", "xls"].includes(ext)) {
      try {
        // Use buffer instead of file path
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        const sheets = {};
        sheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          sheets[sheetName] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        });
        res.json({
          type: 'excel',
          sheets: sheets,
          sheetNames: sheetNames
        });
      } catch (error) {
        console.error('Error reading Excel file:', error);
        res.status(500).send('Error reading Excel file');
      }
      return;
    }

    // Handle CSV files
    if (["csv"].includes(ext)) {
      try {
        const csvContent = buffer.toString('utf8');
        const records = csvParse.parse(csvContent, { skip_empty_lines: true });
        res.json({
          type: 'csv',
          data: records
        });
      } catch (error) {
        console.error('Error reading CSV file:', error);
        res.status(500).send('Error reading CSV file');
      }
      return;
    }

    // Handle PPTX files
    if (["pptx"].includes(ext)) {
      try {
        // Save decrypted buffer to a temp file for pptx2json
        const tempPath = filePath + '.decrypted';
        await fs.promises.writeFile(tempPath, buffer);
        const pptx = new PPTX2Json();
        pptx.parse(tempPath, (err, result) => {
          fs.promises.unlink(tempPath); // Clean up temp file
          if (err) {
            console.error('Error reading PPTX file:', err);
            res.status(500).send('Error reading PPTX file: ' + (err.message || err));
            return;
          }
          res.json({
            type: 'pptx',
            slides: result
          });
        });
      } catch (error) {
        console.error('Error reading PPTX file:', error.stack || error);
        res.status(500).send('Error reading PPTX file');
      }
      return;
    }

    // Handle DOCX files
    if (["docx"].includes(ext)) {
      try {
        // Save decrypted buffer to a temp file for mammoth
        const tempPath = filePath + '.decrypted';
        await fs.promises.writeFile(tempPath, buffer);
        const result = await mammoth.extractRawText({ path: tempPath });
        await fs.promises.unlink(tempPath); // Clean up temp file
        res.json({ type: 'docx', text: result.value });
      } catch (error) {
        console.error('Error reading DOCX file:', error.stack || error);
        res.status(500).send('Error reading DOCX file: ' + (error.message || error));
      }
      return;
    }

    // Handle ZIP files
    if (["zip"].includes(ext)) {
      try {
        // Save decrypted buffer to a temp file for AdmZip
        const tempPath = filePath + '.decrypted';
        await fs.promises.writeFile(tempPath, buffer);
        const zip = new AdmZip(tempPath);
        const zipEntries = zip.getEntries();
        const fileList = zipEntries.map(zipEntry => ({
          name: zipEntry.entryName,
          isDirectory: zipEntry.isDirectory
        }));
        await fs.promises.unlink(tempPath); // Clean up temp file
        res.json({ type: 'zip', files: fileList });
      } catch (error) {
        console.error('Error reading ZIP file:', error.stack || error);
        res.status(500).send('Error reading ZIP file: ' + (error.message || error));
      }
      return;
    }

    // Handle images, pdf, and other binary files
    let contentType = 'text/plain';
    if (ext === 'jpg' || ext === 'jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === 'png') {
      contentType = 'image/png';
    } else if (ext === 'gif') {
      contentType = 'image/gif';
    } else if (ext === 'pdf') {
      contentType = 'application/pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.send(buffer);

  } catch (err) {
    console.error(`Error viewing file ${filename}:`, err);
    if (err.code === 'ENOENT') {
      res.status(404).send('File not found.');
    } else {
      res.status(500).send('Error serving file.');
    }
  }
});

// File Edit Endpoint (for text and Excel files)
app.put('/api/files/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  const ext = path.extname(filename).toLowerCase();

  // Handle Excel files
  if (ext === '.xlsx' || ext === '.xls') {
    try {
      const { sheetName, data } = req.body;
      if (!sheetName || !data) {
        return res.status(400).send('Sheet name and data are required for Excel files');
      }

      const workbook = xlsx.readFile(filePath);
      const worksheet = xlsx.utils.aoa_to_sheet(data);
      workbook.Sheets[sheetName] = worksheet;
      
      xlsx.writeFile(workbook, filePath);
      res.status(200).json({ message: 'Excel file updated successfully' });
    } catch (error) {
      console.error('Error updating Excel file:', error);
      res.status(500).send('Error updating Excel file');
    }
    return;
  }

  // Handle DOCX files
  if (ext === '.docx') {
    try {
      const newText = req.body;
      if (typeof newText !== 'string') {
        return res.status(400).send('Invalid content format. Expected text.');
      }
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: newText.split('\n').map(line => new Paragraph(line)),
          },
        ],
      });
      const buffer = await Packer.toBuffer(doc);
      await fs.promises.writeFile(filePath, buffer);
      res.status(200).json({ message: 'DOCX file updated successfully' });
    } catch (error) {
      console.error('Error updating DOCX file:', error.stack || error);
      res.status(500).send('Error updating DOCX file: ' + (error.message || error));
    }
    return;
  }

  // Handle text files as before
  const newContent = req.body;
  if (typeof newContent !== 'string') {
    console.error('Received non-string content for text file edit:', newContent);
    return res.status(400).send('Invalid content format. Expected text.');
  }

  try {
    await fs.promises.writeFile(filePath, newContent, 'utf8');
    console.log(`File ${filename} updated successfully.`);
    res.status(200).json({ message: 'File updated successfully' });
  } catch (err) {
    console.error(`Error writing to file ${filename}:`, err);
    if (err.code === 'ENOENT') {
      res.status(404).send('File not found.');
    } else {
      res.status(500).send('Error updating file.');
    }
  }
});

// Get dashboard statistics
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const totalFiles = await fs.promises.readdir(path.join(__dirname, 'uploads'));
    const fileCount = totalFiles.filter(f => !f.endsWith('.metadata.json')).length;

    const activeUsers = await User.countDocuments(); // Or use a more advanced method for "active"
    const fileAccessCount = await AuditLog.countDocuments({ action: 'File Downloaded' });

    // Security score: Example calculation (customize as needed)
    const failedLogins = await AuditLog.countDocuments({ action: 'Login Attempt', status: 'failed' });
    const totalLogins = await AuditLog.countDocuments({ action: 'Login Attempt' });
    const securityScore = totalLogins === 0 ? 100 : Math.max(0, 100 - (failedLogins / totalLogins) * 100);

    res.json({
      totalFiles: fileCount,
      activeUsers,
      fileAccess: fileAccessCount,
      securityScore: Math.round(securityScore)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent audit logs
app.get('/api/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(10);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify audit log tamper-proof chain
app.get('/api/audit-logs/verify-chain', async (req, res) => {
  const logs = await AuditLog.find().sort({ timestamp: 1 });
  let prevHash = '';
  for (const log of logs) {
    const { hash, ...logData } = log.toObject();
    const logString = JSON.stringify({ ...logData, prevHash });
    const computedHash = crypto.createHash('sha256').update(logString).digest('hex');
    if (computedHash !== hash) {
      return res.status(200).json({ tampered: true, logId: log._id });
    }
    prevHash = hash;
  }
  res.json({ tampered: false });
});

// --- Add this after your other routes ---

// Get all users (Admin only in production, open for now)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -mfaSecret'); // name is included by default
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role (Admin only in production, open for now)
app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password -mfaSecret' }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ name: user.name, email: user.email, mfaSecret: user.mfaSecret }); // Return user data, excluding password
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update user by ID
app.put('/api/users/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User updated successfully', name: user.name });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Versioning setup
const versionsDir = path.join(__dirname, 'uploads', 'versions');
if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir);

const saveFileVersion = async (filePath, filename) => {
  if (fs.existsSync(filePath)) {
    const timestamp = Date.now();
    const versionedName = `${filename}.${timestamp}`;
    const versionedPath = path.join(versionsDir, versionedName);
    await fs.promises.copyFile(filePath, versionedPath);
  }
};
// Use saveFileVersion(filePath, filename) before overwriting a file

app.get('/api/files/:filename/versions', async (req, res) => {
  const { filename } = req.params;
  const files = await fs.promises.readdir(versionsDir);
  const versions = files
    .filter(f => f.startsWith(filename + '.'))
    .map(f => ({
      version: f.split('.').pop(),
      name: f,
      path: `/uploads/versions/${f}`,
    }));
  res.json(versions);
});

// Restore file to a specific version
app.post('/api/files/:filename/restore', async (req, res) => {
  const { filename } = req.params;
  const { version } = req.body;
  const versionedPath = path.join(versionsDir, `${filename}.${version}`);
  const filePath = path.join(__dirname, 'uploads', filename);
  if (!fs.existsSync(versionedPath)) return res.status(404).send('Version not found');
  await fs.promises.copyFile(versionedPath, filePath);
  res.json({ message: 'File restored to selected version.' });
});

// Search Endpoint
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  const uploadDir = path.join(__dirname, 'uploads');
  const files = await fs.promises.readdir(uploadDir);
  const results = [];
  for (const file of files) {
    if (file.endsWith('.metadata.json')) continue;
    const metadataPath = path.join(uploadDir, `${file}.metadata.json`);
    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
    }
    if (
      file.toLowerCase().includes(q.toLowerCase()) ||
      (metadata.title && metadata.title.toLowerCase().includes(q.toLowerCase())) ||
      (metadata.description && metadata.description.toLowerCase().includes(q.toLowerCase()))
    ) {
      results.push({ file, ...metadata });
      continue;
    }
    const ext = path.extname(file).toLowerCase();
    if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
      const content = await fs.promises.readFile(path.join(uploadDir, file), 'utf8');
      if (content.toLowerCase().includes(q.toLowerCase())) {
        results.push({ file, ...metadata });
      }
    }
  }
  res.json(results);
});

// Backup Endpoint
app.post('/api/backup', async (req, res) => {
  const backupDir = path.join(__dirname, 'backups');
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const output = fs.createWriteStream(path.join(backupDir, `backup-${Date.now()}.zip`));
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`Backup complete: ${archive.pointer()} total bytes`);
    res.status(200).json({ message: 'Backup created successfully', path: `/backups/backup-${Date.now()}.zip` });
  });

  archive.on('error', (err) => {
    console.error('Error during backup:', err);
    res.status(500).json({ message: 'Error creating backup' });
  });

  archive.pipe(output);
  archive.directory(uploadsDir, false);
  archive.finalize();
});

// Restore Backup Endpoint
app.post('/api/restore-backup', async (req, res) => {
  // Only allow admin users in production!
  const backupFile = req.body.backupFile;
  const backupPath = path.join(__dirname, 'backups', backupFile);
  if (!fs.existsSync(backupPath)) return res.status(404).send('Backup not found');
  fs.createReadStream(backupPath)
    .pipe(unzipper.Extract({ path: path.join(__dirname, 'uploads') }))
    .on('close', () => res.json({ message: 'Restore complete' }))
    .on('error', err => res.status(500).send('Restore failed'));
});

if (process.env.NODE_ENV === 'production') {
  const privateKey = fs.readFileSync('/path/to/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('/path/to/fullchain.pem', 'utf8');
  const credentials = { key: privateKey, cert: certificate };
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(PORT, () => console.log(`HTTPS Server running on port ${PORT}`));
} else {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Example: Unauthorized access endpoint
app.post('/api/secure-action', (req, res) => {
  const user = req.user; // however you get the user
  if (!user || !user.isAuthorized) {
    triggerNotification(
      'unauthorized_access',
      `Unauthorized access attempt at ${new Date().toLocaleString()}`
    );
    return res.status(403).json({ error: 'Unauthorized' });
  }
  res.json({ success: true });
});

// Example: Data change endpoint
app.post('/api/data-change', (req, res) => {
  // ...your logic...
  triggerNotification(
    'data_change',
    `Data changed by user at ${new Date().toLocaleString()}`
  );
  res.json({ success: true });
});

// Notification APIs
app.get('/api/notifications', getNotifications);
app.post('/api/notifications/clear', clearNotifications);
app.put('/api/notifications/:id', updateNotificationStatus);

// Reports Endpoint
app.get('/api/reports', async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, 'uploads');
  const files = await fs.promises.readdir(uploadsDir);

  // Only count files, not metadata
  const realFiles = files.filter(f => !f.endsWith('.metadata.json'));
  const fileMetas = files.filter(f => f.endsWith('.metadata.json'));

  // Files uploaded today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let filesToday = 0;
  let totalSize = 0;
  let recentUploads = [];

  fileMetas.forEach(metaFile => {
    const metaPath = path.join(uploadsDir, metaFile);
    const stats = fs.statSync(metaPath);
    totalSize += stats.size;
    if (stats.mtime >= today) filesToday++;

    let displayName = metaFile.replace('.metadata.json', '');
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      // Use title if available, else strip leading numbers and dash
      displayName = meta.title ||
        displayName.replace(/^\d+-/, ''); // removes leading numbers and dash
    } catch {}
    recentUploads.push({
      filename: displayName,
      uploadedAt: stats.mtime,
    });
  });

  recentUploads = recentUploads
    .sort((a, b) => b.uploadedAt - a.uploadedAt)
    .slice(0, 5);

  // Example: Read users from your User model
  const User = require('./models/User');
  const users = await User.find();

  // Storage used (in MB)
  const storageUsed = (totalSize / (1024 * 1024)).toFixed(2) + " MB";

  // Count uploads per user
  const userUploadCounts = {};
  fileMetas.forEach(metaFile => {
    const metaPath = path.join(uploadsDir, metaFile);
    let ownerId = "Unknown";
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      ownerId = meta.ownerId || "Unknown";
    } catch {}
    userUploadCounts[ownerId] = (userUploadCounts[ownerId] || 0) + 1;
  });

  // Find the userId with the most uploads
  let mostActiveUserId = "Unknown";
  let maxUploads = 0;
  for (const [userId, count] of Object.entries(userUploadCounts)) {
    if (count > maxUploads && userId !== "Unknown") {
      mostActiveUserId = userId;
      maxUploads = count;
    }
  }

  // Get the user's name from the DB
  let mostActiveUser = "N/A";
  if (mostActiveUserId !== "Unknown") {
    const userObj = users.find(u => u._id.toString() === mostActiveUserId);
    mostActiveUser = userObj ? userObj.name : "N/A";
  }

  res.json({
    totalFiles: realFiles.length, // <-- fix here
    totalUsers: users.length,
    filesToday,
    mostActiveUser,
    lastLogin: users[0]?.lastLogin || "",
    storageUsed,
    recentUploads,
  });
});

// Reports Router
const reportsRouter = require('./routes/reports');
app.use('/api/reports', reportsRouter);