/**
 * SYNOPSIS: Exports getCommunicationProfile — services/lifeos-communication-profile.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { LitElement, html, css } from 'lit';

export async function getCommunicationProfile(userId) {
  const response = await fetch(`/api/communication_profiles/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch communication profile');
  }
  return await response.json();
}

export class CommunicationProfileOverlay extends LitElement {
  static styles = css`
    .overlay-card {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      min-width: 300px; /* Added for better presentation */
    }
    h3 {
      margin-top: 0;
      color: #333; /* Added for better presentation */
    }
    p {
      margin: 5px 0;
      color: #555; /* Added for better presentation */
    }
    strong {
      color: #000; /* Added for better presentation */
    }
  `;

  static properties = {
    profile: { type: Object },
    isVisible: { type: Boolean } // Added to control visibility
  };

  constructor() {
    super();
    this.profile = {};
    this.isVisible = false; // Initially hidden
    // The fetching logic should ideally be triggered by an event or prop change
    // from the parent component (lifeos-coach.html) when the overlay is made visible.
  }

  // Method to be called by the parent to show the overlay and fetch data
  async showProfile(userId) {
    this.isVisible = true;
    try {
      this.profile = await getCommunicationProfile(userId);
    } catch (error) {
      console.error('Error fetching communication profile:', error);
      this.profile = { style: 'N/A', effectiveness: 'N/A', notes: 'Failed to load profile.' };
    }
  }

  hideProfile() {
    this.isVisible = false;
  }

  render() {
    if (!this.isVisible) {
      return html``;
    }

    if (!this.profile || Object.keys(this.profile).length === 0) {
      return html`
        <div class="overlay-card">
          <h3>Your Communication Profile</h3>
          <p>Loading communication profile...</p>
          <button @click="${this.hideProfile}">Close</button>
        </div>
      `;
    }

    return html`
      <div class="overlay-card">
        <h3>Your Communication Profile</h3>
        <p><strong>Style:</strong> ${this.profile.style}</p>
        <p><strong>Effectiveness:</strong> ${this.profile.effectiveness}</p>
        <p><strong>Notes:</strong> ${this.profile.notes || 'N/A'}</p>
        <button @click="${this.hideProfile}">Close</button>
      </div>
    `;
  }
}

customElements.define('communication-profile-overlay', CommunicationProfileOverlay);
