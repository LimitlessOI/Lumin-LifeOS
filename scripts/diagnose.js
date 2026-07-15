/**
 * SYNOPSIS: Exports diagnoseGitHubToken — scripts/diagnose.js.
 */
import process from 'process';
import fetch from 'node-fetch';

export async function diagnoseGitHubToken() {
  const token = process.env.GITHUB_TOKEN;
  const baseUrl = process.env.PUBLIC_BASE_URL;

  if (!token) {
    return { github_token: false, error: "GITHUB_TOKEN is not set" };
  }

  try {
    const response = await fetch(`${baseUrl}/ready`, {
      headers: {
        Authorization: `token ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return { github_token: data.github_token };
    } else {
      return { github_token: false, error: "Failed to fetch /ready endpoint" };
    }
  } catch (error) {
    return { github_token: false, error: error.message };
  }
}