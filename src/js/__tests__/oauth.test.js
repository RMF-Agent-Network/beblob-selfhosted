import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildOAuthAuthorizeUrl,
  buildOAuthTokenUrl,
} from '../urls.js';
import {
  authenticateWithGitLab,
  requestAccessToken,
} from '../main.js';

describe('OAuth redirect construction', () => {
  let originalLocation;

  beforeEach(() => {
    // Save and mock window.location
    originalLocation = window.location;
    delete window.location;
    window.location = {
      href: 'https://mysite.com/blog/post',
      search: '',
      origin: 'https://mysite.com',
    };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('authenticateWithGitLab redirects to {gitlabUrl}/oauth/authorize', () => {
    const config = {
      gitlabUrl: 'https://gitlab.company.com',
      clientId: 'test-client-id',
      redirectUri: 'https://mysite.com/',
    };

    authenticateWithGitLab(config);

    expect(window.location.href).toContain(
      'https://gitlab.company.com/oauth/authorize'
    );
  });

  it('includes correct client_id in redirect', () => {
    const config = {
      gitlabUrl: 'https://gitlab.company.com',
      clientId: 'my-specific-client-id',
      redirectUri: 'https://mysite.com/',
    };

    authenticateWithGitLab(config);

    expect(window.location.href).toContain('client_id=my-specific-client-id');
  });

  it('includes encoded redirect_uri', () => {
    const config = {
      gitlabUrl: 'https://gitlab.company.com',
      clientId: 'test-client-id',
      redirectUri: 'https://mysite.com/callback',
    };

    authenticateWithGitLab(config);

    expect(window.location.href).toContain(
      'redirect_uri=' + encodeURIComponent('https://mysite.com/callback')
    );
  });

  it('includes state parameter with current page URL', () => {
    window.location.href = 'https://mysite.com/blog/my-post';
    const config = {
      gitlabUrl: 'https://gitlab.company.com',
      clientId: 'test-client-id',
      redirectUri: 'https://mysite.com/',
    };

    authenticateWithGitLab(config);

    // The state should contain the encoded original URL
    expect(window.location.href).toContain('state=');
  });

  it('uses custom gitlabUrl when configured', () => {
    const config = {
      gitlabUrl: 'https://my-custom-gitlab.example.org',
      clientId: 'test-client-id',
      redirectUri: 'https://mysite.com/',
    };

    authenticateWithGitLab(config);

    expect(window.location.href).toContain(
      'https://my-custom-gitlab.example.org/oauth/authorize'
    );
  });
});

describe('Token exchange', () => {
  const customGitlabUrl = 'https://gitlab.company.com';

  beforeEach(() => {
    global.fetch = vi.fn();
    // Mock localStorage
    const store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => store[key] || null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key, value) => { store[key] = value; }
    );
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
      (key) => { delete store[key]; }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to {gitlabUrl}/oauth/token with correct body', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'new-token' }),
    });

    const config = {
      gitlabUrl: customGitlabUrl,
      clientId: 'test-client-id',
      redirectUri: 'https://mysite.com/',
    };

    await requestAccessToken(config, 'auth-code-123');

    expect(global.fetch).toHaveBeenCalledWith(
      `${customGitlabUrl}/oauth/token`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('auth-code-123'),
      })
    );
  });

  it('stores received token in localStorage', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'my-new-access-token' }),
    });

    const config = {
      gitlabUrl: customGitlabUrl,
      clientId: 'test-client-id',
      redirectUri: 'https://mysite.com/',
    };

    await requestAccessToken(config, 'auth-code-123');

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'beblobAccessToken',
      'my-new-access-token'
    );
  });

  it('handles token exchange failure gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    const config = {
      gitlabUrl: customGitlabUrl,
      clientId: 'test-client-id',
      redirectUri: 'https://mysite.com/',
    };

    // Should not throw
    await expect(
      requestAccessToken(config, 'bad-code')
    ).resolves.not.toThrow();
  });
});
