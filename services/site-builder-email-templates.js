// services/site-builder-email-templates.js

/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 */
export function getEmailSubject(type, businessName) {
  switch (type) {
    case 'initial':
      return `Welcome to your new site, ${businessName}!`;
    case 'followup3':
      return `Your site is live and waiting, ${businessName}!`;
    case 'followup7':
      return `Final check-in, ${businessName} - let's schedule a call!`;
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

export function getInitialOutreachEmail(businessInfo, previewUrl) {
  const industry = businessInfo.industry;
  const industryText = industry === 'mindbody' ? 'Mindbody' : 'Jane App';
  const unsubscribeLink = `https://example.com/unsubscribe`;

  return `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f2f2f2;
          }
          h1 {
            font-size: 24px;
            color: #333;
          }
          button {
            background-color: #4CAF50;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover {
            background-color: #3e8e41;
          }
        </style>
      </head>
      <body>
        <h1>Welcome to your new site!</h1>
        <p>Check out your free preview site: <a href="${previewUrl}">Preview Site</a></p>
        <p>We're excited to help you grow your business with ${industryText} integration!</p>
        <p>Best regards, Site Builder Team</p>
        <p>Unsubscribe: <a href="${unsubscribeLink}">Unsubscribe</a></p>
      </body>
    </html>
  `;
}

export function getFollowUp3DayEmail(businessInfo, previewUrl) {
  return `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f2f2f2;
          }
          h1 {
            font-size: 24px;
            color: #333;
          }
          button {
            background-color: #4CAF50;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover {
            background-color: #3e8e41;
          }
        </style>
      </head>
      <body>
        <h1>Your site is live and waiting!</h1>
        <p>Check out your site: <a href="${previewUrl}">Site URL</a></p>
        <p>Best regards, Site Builder Team</p>
      </body>
    </html>
  `;
}

export function getFollowUp7DayEmail(businessInfo, previewUrl) {
  return `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f2f2f2;
          }
          h1 {
            font-size: 24px;
            color: #333;
          }
          button {
            background-color: #4CAF50;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover {
            background-color: #3e8e41;
          }
        </style>
      </head>
      <body>
        <h1>Final check-in!</h1>
        <p>Let's schedule a call to discuss your site: <a href="${previewUrl}">Site URL</a></p>
        <p>Best regards, Site Builder Team</p>
      </body>
    </html>
  `;
}