/**
 * SYNOPSIS: Generate the email content for weekly progress
 */
// services/progress-email-service.js

import nodemailer from 'nodemailer';

// Configure the email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Generate the email content for weekly progress
 * @param {string} recipient - The recipient email address
 * @param {string} progressData - The progress data to include in the email
 * @returns {object} - The email options object
 */
function generateEmailContent(recipient, progressData) {
  return {
    from: process.env.EMAIL_USER,
    to: recipient,
    subject: 'Weekly Progress Update',
    text: `Here is your weekly progress update:\n\n${progressData}`,
  };
}

/**
 * Schedule and send a weekly progress email
 * @param {string} recipient - The recipient email address
 * @param {string} progressData - The progress data to include in the email
 */
function scheduleWeeklyEmail(recipient, progressData) {
  const mailOptions = generateEmailContent(recipient, progressData);

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(`Error sending email: ${error}`);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
}

export { scheduleWeeklyEmail };
