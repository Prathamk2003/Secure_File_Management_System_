const nodemailer = require('nodemailer');
const Notification = require('./models/Notification'); // Import the Notification model

const notificationRules = [
  {
    event: 'unauthorized_access',
    notifyBy: ['email'],
    email: 'admin@example.com'
  },
  {
    event: 'data_change',
    notifyBy: ['email'],
    email: 'admin@example.com'
  }
];

// Remove the in-memory array
// let notifications = [];

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_email_password'
  }
});

function sendEmailNotification(to, subject, text) {
  const mailOptions = {
    from: 'your_email@gmail.com',
    to,
    subject,
    text
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email error:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

async function triggerNotification(event, message) { // Make function async
  try {
    // Create a new notification in the database
    const newNotification = new Notification({
      message,
      // timestamp is defaulted in the schema
    });
    await newNotification.save();
    console.log('Notification saved to database:', newNotification);

  } catch (error) {
    console.error('Error saving notification to database:', error);
  }

  // Keep email notification logic
  notificationRules
    .filter(rule => rule.event === event)
    .forEach(rule => {
      if (rule.notifyBy.includes('email')) {
        sendEmailNotification(
          rule.email,
          `Alert: ${event.replace('_', ' ')}`,
          message
        );
      }
    });
}

async function getNotifications(req, res) { // Make function async
  try {
    // Fetch notifications from the database, sorted by timestamp
    const notifications = await Notification.find().sort({ timestamp: 1 });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
}

async function clearNotifications(req, res) { // Make function async
  try {
    // Delete all notifications from the database
    await Notification.deleteMany({});
    console.log('All notifications cleared from database.');
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Error clearing notifications' });
  }
}

async function updateNotificationStatus(req, res) {
  try {
    const { id } = req.params;
    const { visited } = req.body;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { visited: visited },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error updating notification status:', error);
    res.status(500).json({ message: 'Error updating notification status' });
  }
}

module.exports = {
  triggerNotification,
  getNotifications,
  clearNotifications,
  updateNotificationStatus
};