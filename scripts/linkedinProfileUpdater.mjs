/**
 * SYNOPSIS: Exports updateLinkedInProfile — scripts/linkedinProfileUpdater.mjs.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
import puppeteer from 'puppeteer';

/**
 * Updates LinkedIn profile to include sprint offers in the summary section.
 * @param {Array} sprintOffers - An array of sprint offers, each containing a title and description.
 */
export async function updateLinkedInProfile(sprintOffers) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to LinkedIn login page
    await page.goto('https://www.linkedin.com/login');

    // Login logic here (omitted for security reasons)

    // Navigate to profile edit page
    await page.goto('https://www.linkedin.com/in/YOUR_PROFILE_URL_HERE/edit/intro/'); // Replace with actual profile URL

    const addSprintOffersToProfile = async (offers) => {
      const aboutSelector = 'textarea[name="summary"]'; // Update with the actual selector

      const element = await page.$(aboutSelector);
      if (element) {
        const currentText = await page.evaluate(el => el.value, element);
        let newText = currentText;

        const offersText = offers.map(offer => `- ${offer.title}: ${offer.description}`).join('\n');

        if (!currentText.includes('Sprint Offers:')) {
          newText += `\n\nSprint Offers:\n${offersText}`;
        } else {
          const existingOffersRegex = /Sprint Offers:\n[\s\S]*?(?=\n\n|$)/;
          newText = currentText.replace(existingOffersRegex, `Sprint Offers:\n${offersText}`);
        }

        await page.evaluate((selector, value) => {
          const el = document.querySelector(selector);
          if (el) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, aboutSelector, newText);

        const saveButtonSelector = 'button[data-control-name="save_edit_about"]'; // Update with the actual selector
        const saveButton = await page.$(saveButtonSelector);
        if (saveButton) {
          await saveButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => console.log('Save navigation timed out, but proceeding.'));
          console.log('Profile updated successfully.');
        } else {
          console.warn('Save button not found. Profile might not be saved.');
        }
      } else {
        console.error(`Target element for profile update not found: ${aboutSelector}`);
      }
    };

    await addSprintOffersToProfile(sprintOffers);

  } catch (error) {
    console.error('Error updating LinkedIn profile:', error);
  } finally {
    await browser.close();
  }
}
