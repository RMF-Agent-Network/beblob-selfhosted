/**
 * Configuration parsing module for BeBlob.
 * Extracts and validates config from the script tag's data attributes.
 */

import { normalizeGitlabUrl } from './urls.js';

/**
 * Parse configuration from a script element's dataset.
 * @param {HTMLElement} scriptElement - The script element with data-* attributes.
 * @returns {object} The parsed and validated configuration object.
 * @throws {Error} If required configuration is missing or invalid.
 */
export function parseConfig(scriptElement) {
  if (!scriptElement || !scriptElement.dataset) {
    throw new Error('Missing required BeBlob configuration in auto init');
  }

  const dataset = scriptElement.dataset;

  const devMode =
    dataset.devMode === 'true' || dataset.devMode === true;

  // Read and normalize gitlabUrl
  const gitlabUrl = normalizeGitlabUrl(dataset.gitlabUrl, devMode);

  const config = {
    gitlabUrl,
    clientId: dataset.clientId,
    redirectUri: dataset.redirectUri,
    projectName: dataset.projectName,
    issueMappingStrategy: dataset.issueMappingStrategy,
    issueId: dataset.issueId, // Optional; required only if mapping strategy is "issueId"
    devMode: dataset.devMode, // "true" or "false"
    beblobVersion: dataset.beblobVersion, // e.g., "1.7.0"
    theme: dataset.theme || 'light',
  };

  // Validate required fields
  if (
    !config.clientId ||
    !config.redirectUri ||
    !config.projectName ||
    !config.issueMappingStrategy
  ) {
    throw new Error('Missing required BeBlob configuration in auto init');
  }

  return config;
}
