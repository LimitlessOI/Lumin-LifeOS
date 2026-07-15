/**
 * SYNOPSIS: Script — ScheduleProgressEmails.
 */
import nodemailer from 'nodemailer';
import schedule from 'node-schedule';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

function sendProgressEmail(recipient, subject, body) {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: recipient,
    subject: subject,
    text: body
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

function scheduleWeeklyEmail(recipient, subject, body) {
  schedule.scheduleJob('0 9 * * 1', function() { // Every Monday at 9 AM
    sendProgressEmail(recipient, subject, body);
  });
}

export { sendProgressEmail, scheduleWeeklyEmail };