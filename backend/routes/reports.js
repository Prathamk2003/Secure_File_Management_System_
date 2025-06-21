const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

// GET /api/reports/files?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/files', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Start and end dates required' });

    const uploadDir = path.join(__dirname, '..', 'uploads');
    const files = await fs.promises.readdir(uploadDir);
    const fileList = [];

    // Collect all unique ownerIds
    const ownerIdsSet = new Set();

    for (const file of files) {
      if (file.endsWith('.metadata.json')) continue;
      const metadataPath = path.join(uploadDir, `${file}.metadata.json`);
      let metadata = {};
      let uploadedAt = null;
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
        const stat = await fs.promises.stat(metadataPath);
        uploadedAt = stat.mtime;
        if (metadata.ownerId && metadata.ownerId !== 'dummy-user-id') {
          ownerIdsSet.add(metadata.ownerId);
        }
      } else {
        const stat = await fs.promises.stat(path.join(uploadDir, file));
        uploadedAt = stat.mtime;
      }
      // Filter by date
      if (uploadedAt) {
        const uploadedDate = new Date(uploadedAt);
        if (uploadedDate >= new Date(start) && uploadedDate <= new Date(end + 'T23:59:59.999Z')) {
          fileList.push({
            name: file,
            uploadedAt: uploadedAt,
            owner: metadata.ownerId || 'Unknown',
          });
        }
      }
    }

    // Fetch user names for these IDs
    const ownerIds = Array.from(ownerIdsSet);
    const users = await User.find({ _id: { $in: ownerIds } }, '_id name');
    const userMap = {};
    users.forEach(u => { userMap[u._id] = u.name; });

    // Attach ownerName to each file
    const filesWithOwnerName = fileList.map(file => ({
      ...file,
      name: file.name.replace(/^\d+-/, ''), // Remove leading digits and dash
      ownerName: userMap[file.owner] || (file.owner === 'Unknown' ? 'Unknown' : file.owner)
    }));

    res.json(filesWithOwnerName);
  } catch (err) {
    console.error('Error in /api/reports/files:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/users?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/users', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Start and end dates required' });

    const startDate = new Date(start);
    const endDate = new Date(end + 'T23:59:59.999Z');

    const users = await User.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    res.json(
      users.map(u => ({
        name: u.name,
        email: u.email,
        createdAt: u.createdAt
      }))
    );
  } catch (err) {
    console.error('Error in /api/reports/users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;