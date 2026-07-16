/**
 * SYNOPSIS: Exports scheduleWeeklyProgressEmails — scripts/schedule-progress-emails.mjs.
 */
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const emailTemplatePath = path.resolve('templates', 'progress-email-template.html');
const emailTemplate = fs.readFileSync(emailTemplatePath, 'utf-8');

export async function scheduleWeeklyProgressEmails(recipients) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipients,
        subject: 'Weekly Progress Update',
        html: emailTemplate
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Progress emails sent successfully');
    } catch (error) {
        console.error('Error sending progress emails:', error);
    }
}