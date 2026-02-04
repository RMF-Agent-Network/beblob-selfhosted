import { describe, it, expect } from 'vitest';
import {
  normalizeGitlabUrl,
  buildApiUrl,
  buildOAuthAuthorizeUrl,
  buildOAuthTokenUrl,
} from '../urls.js';

describe('normalizeGitlabUrl', () => {
  it('returns default when input is undefined', () => {
    expect(normalizeGitlabUrl(undefined)).toBe('https://gitlab.com');
  });

  it('returns default when input is empty string', () => {
    expect(normalizeGitlabUrl('')).toBe('https://gitlab.com');
  });

  it('returns default when input is whitespace', () => {
    expect(normalizeGitlabUrl('   ')).toBe('https://gitlab.com');
  });

  it('strips trailing slash', () => {
    expect(normalizeGitlabUrl('https://gitlab.company.com/')).toBe(
      'https://gitlab.company.com'
    );
  });

  it('strips multiple trailing slashes', () => {
    expect(normalizeGitlabUrl('https://gitlab.company.com///')).toBe(
      'https://gitlab.company.com'
    );
  });

  it('preserves https URL without trailing slash', () => {
    expect(normalizeGitlabUrl('https://gitlab.company.com')).toBe(
      'https://gitlab.company.com'
    );
  });

  it('preserves http URL in devMode', () => {
    expect(normalizeGitlabUrl('http://localhost:3000', true)).toBe(
      'http://localhost:3000'
    );
  });

  it('throws on http URL when not in devMode', () => {
    expect(() => normalizeGitlabUrl('http://gitlab.company.com')).toThrow(
      'http:// is only allowed in devMode'
    );
  });

  it('throws on URL with path component', () => {
    expect(() =>
      normalizeGitlabUrl('https://company.com/gitlab')
    ).toThrow('must not contain a path component');
  });

  it('throws on non-URL string', () => {
    expect(() => normalizeGitlabUrl('not-a-url')).toThrow('must start with https://');
  });

  it('throws on URL without protocol', () => {
    expect(() => normalizeGitlabUrl('gitlab.company.com')).toThrow(
      'must start with https://'
    );
  });
});

describe('buildApiUrl', () => {
  it('constructs correct URL for default gitlab.com', () => {
    expect(buildApiUrl('https://gitlab.com', 'projects/123/issues')).toBe(
      'https://gitlab.com/api/v4/projects/123/issues'
    );
  });

  it('constructs correct URL for custom domain', () => {
    expect(
      buildApiUrl('https://gitlab.company.com', 'projects/123/issues')
    ).toBe('https://gitlab.company.com/api/v4/projects/123/issues');
  });

  it('handles path with query parameters', () => {
    expect(
      buildApiUrl('https://gitlab.com', 'projects?search=my-project')
    ).toBe('https://gitlab.com/api/v4/projects?search=my-project');
  });

  it('handles path with nested resources', () => {
    expect(
      buildApiUrl(
        'https://gitlab.company.com',
        'projects/123/issues/456/award_emoji'
      )
    ).toBe(
      'https://gitlab.company.com/api/v4/projects/123/issues/456/award_emoji'
    );
  });

  it('does not double-slash between base and path', () => {
    const result = buildApiUrl('https://gitlab.com', 'user');
    expect(result).toBe('https://gitlab.com/api/v4/user');
    expect(result).not.toContain('//api');
  });
});

describe('buildOAuthAuthorizeUrl', () => {
  it('constructs authorize URL for gitlab.com', () => {
    const url = buildOAuthAuthorizeUrl('https://gitlab.com', {
      clientId: 'my-client-id',
      redirectUri: 'https://mysite.com/',
      state: 'https://mysite.com/page',
    });
    expect(url).toContain('https://gitlab.com/oauth/authorize?');
  });

  it('constructs authorize URL for custom domain', () => {
    const url = buildOAuthAuthorizeUrl('https://gitlab.company.com', {
      clientId: 'my-client-id',
      redirectUri: 'https://mysite.com/',
      state: 'https://mysite.com/page',
    });
    expect(url).toContain('https://gitlab.company.com/oauth/authorize?');
  });

  it('includes all required OAuth parameters', () => {
    const url = buildOAuthAuthorizeUrl('https://gitlab.com', {
      clientId: 'my-client-id',
      redirectUri: 'https://mysite.com/',
      state: 'some-state',
    });
    expect(url).toContain('client_id=my-client-id');
    expect(url).toContain('response_type=code');
    expect(url).toContain('redirect_uri=');
  });

  it('properly encodes redirect URI', () => {
    const url = buildOAuthAuthorizeUrl('https://gitlab.com', {
      clientId: 'my-client-id',
      redirectUri: 'https://mysite.com/callback?foo=bar',
      state: 'some-state',
    });
    expect(url).toContain(
      'redirect_uri=' + encodeURIComponent('https://mysite.com/callback?foo=bar')
    );
  });

  it('includes state parameter', () => {
    const url = buildOAuthAuthorizeUrl('https://gitlab.com', {
      clientId: 'my-client-id',
      redirectUri: 'https://mysite.com/',
      state: 'my-state-value',
    });
    expect(url).toContain('state=my-state-value');
  });
});

describe('buildOAuthTokenUrl', () => {
  it('constructs token URL for gitlab.com', () => {
    expect(buildOAuthTokenUrl('https://gitlab.com')).toBe(
      'https://gitlab.com/oauth/token'
    );
  });

  it('constructs token URL for custom domain', () => {
    expect(buildOAuthTokenUrl('https://gitlab.company.com')).toBe(
      'https://gitlab.company.com/oauth/token'
    );
  });
});
