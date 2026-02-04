import { describe, it, expect } from 'vitest';
import { parseConfig } from '../config.js';

/**
 * Helper to create a mock script element with data attributes.
 */
function createMockScript(attrs = {}) {
  const el = document.createElement('script');
  el.id = 'beblob-script';
  // Set default required attributes
  const defaults = {
    clientId: 'test-client-id',
    redirectUri: 'https://mysite.com/',
    projectName: 'my-project',
    issueMappingStrategy: 'pageTitle',
  };
  const merged = { ...defaults, ...attrs };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== null) {
      // Convert camelCase to kebab-case for data attributes
      const attrName = 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      el.setAttribute(attrName, value);
    }
  }
  return el;
}

describe('parseConfig', () => {
  it('reads gitlabUrl from data-gitlab-url attribute', () => {
    const script = createMockScript({ gitlabUrl: 'https://gitlab.company.com' });
    const config = parseConfig(script);
    expect(config.gitlabUrl).toBe('https://gitlab.company.com');
  });

  it('defaults gitlabUrl to https://gitlab.com when absent', () => {
    const script = createMockScript({});
    const config = parseConfig(script);
    expect(config.gitlabUrl).toBe('https://gitlab.com');
  });

  it('normalizes gitlabUrl before storing', () => {
    const script = createMockScript({ gitlabUrl: 'https://gitlab.company.com/' });
    const config = parseConfig(script);
    expect(config.gitlabUrl).toBe('https://gitlab.company.com');
  });

  it('validates gitlabUrl and throws descriptive error on invalid', () => {
    const script = createMockScript({ gitlabUrl: 'not-a-url' });
    expect(() => parseConfig(script)).toThrow('Invalid gitlabUrl');
  });

  it('still requires clientId, redirectUri, projectName, issueMappingStrategy', () => {
    const el = document.createElement('script');
    el.id = 'beblob-script';
    el.setAttribute('data-gitlab-url', 'https://gitlab.com');
    // Missing all required fields
    expect(() => parseConfig(el)).toThrow('Missing required BeBlob configuration');
  });

  it('all existing config options still parsed correctly', () => {
    const script = createMockScript({
      gitlabUrl: 'https://gitlab.company.com',
      issueId: '42',
      devMode: 'false',
      beblobVersion: '1.7.0',
      theme: 'dark',
    });
    const config = parseConfig(script);
    expect(config.clientId).toBe('test-client-id');
    expect(config.redirectUri).toBe('https://mysite.com/');
    expect(config.projectName).toBe('my-project');
    expect(config.issueMappingStrategy).toBe('pageTitle');
    expect(config.issueId).toBe('42');
    expect(config.devMode).toBe('false');
    expect(config.beblobVersion).toBe('1.7.0');
    expect(config.theme).toBe('dark');
  });
});
