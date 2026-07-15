/**
 * SYNOPSIS: Exports checkEmailServiceStartup — services/email-service-startup-check.js.
 */
import nodemailer from 'nodemailer';

export async function checkEmailServiceStartup() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true', // Use 'true'/'false' string for boolean
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.verify();
    console.log('Email service provider configuration verified successfully.');
    return true;
  } catch (error) {
    console.error('Email service provider configuration verification failed:', error.message);
    return false;
  }
}