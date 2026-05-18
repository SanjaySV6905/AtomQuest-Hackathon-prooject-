const { Notification } = require('../models/index');

async function createNotification(userId, type, title, message, link = '') {
  try {
    await Notification.create({ userId, type, title, message, link });
  } catch (err) {
    console.error('Notification create error:', err.message);
  }
}

module.exports = { createNotification };
