const express = require('express');
const {
  triggerNotification,
  getNotifications,
  clearNotifications
} = require('./backend/notifications');

const app = express();
app.use(express.json());

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

module.exports = app;