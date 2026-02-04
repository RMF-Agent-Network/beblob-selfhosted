/**
 * URL helper module for BeBlob.
 * Centralizes all GitLab URL construction.
 */

const DEFAULT_GITLAB_URL = 'https://gitlab.com';

/**
 * Normalize and validate a GitLab instance URL.
 * @param {string} input - The raw gitlabUrl value from config.
 * @param {boolean} [devMode=false] - Whether dev mode is enabled (allows http://).
 * @returns {string} The normalized URL.
 * @throws {Error} If the URL is invalid.
 */
export function normalizeGitlabUrl(input, devMode = false) {
  // Empty / undefined / whitespace → default
  if (input == null || (typeof input === 'string' && input.trim() === '')) {
    return DEFAULT_GITLAB_URL;
  }

  let url = input.trim();

  // Must have a protocol
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `Invalid gitlabUrl: "${input}" — must start with https:// (or http:// in devMode)`
    );
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  // Parse to validate structure
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid gitlabUrl: "${input}" — not a valid URL`);
  }

  // No path component allowed (must be domain root)
  if (parsed.pathname && parsed.pathname !== '/') {
    throw new Error(
      `Invalid gitlabUrl: "${input}" — must not contain a path component`
    );
  }

  // http:// only allowed in devMode
  if (parsed.protocol === 'http:' && !devMode) {
    throw new Error(
      `Invalid gitlabUrl: "${input}" — http:// is only allowed in devMode`
    );
  }

  return url;
}

/**
 * Build a GitLab API v4 URL.
 * @param {string} gitlabUrl - The normalized GitLab base URL.
 * @param {string} path - The API path (without leading slash), e.g. "projects/123/issues".
 * @returns {string} The full API URL.
 */
export function buildApiUrl(gitlabUrl, path) {
  const base = gitlabUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${base}/api/v4/${cleanPath}`;
}

/**
 * Build the GitLab OAuth authorize URL.
 * @param {string} gitlabUrl - The normalized GitLab base URL.
 * @param {object} params - OAuth parameters.
 * @param {string} params.clientId - The OAuth application client ID.
 * @param {string} params.redirectUri - The redirect URI.
 * @param {string} params.state - The state parameter (for CSRF protection).
 * @returns {string} The full OAuth authorize URL.
 */
export function buildOAuthAuthorizeUrl(gitlabUrl, { clientId, redirectUri, state }) {
  const base = gitlabUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state,
  });
  return `${base}/oauth/authorize?${params.toString()}`;
}

/**
 * Build the GitLab OAuth token URL.
 * @param {string} gitlabUrl - The normalized GitLab base URL.
 * @returns {string} The full OAuth token URL.
 */
export function buildOAuthTokenUrl(gitlabUrl) {
  const base = gitlabUrl.replace(/\/+$/, '');
  return `${base}/oauth/token`;
}
