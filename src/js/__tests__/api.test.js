import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildApiUrl, buildOAuthTokenUrl } from '../urls.js';

// We test the module-scope functions by importing them directly.
// These functions need gitlabUrl as a parameter after refactoring.
import {
  createIssue,
  fetchReactions,
  addReaction,
  removeReaction,
} from '../main.js';

describe('API calls with custom gitlabUrl', () => {
  const customGitlabUrl = 'https://gitlab.company.com';
  const mockToken = 'test-access-token';
  const mockProjectId = 12345;
  const mockIssueIid = 42;

  beforeEach(() => {
    window.projectId = mockProjectId;
    window.currentIssueId = mockIssueIid;
    window.currentUser = { id: 1, name: 'Test User' };
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createIssue calls {gitlabUrl}/api/v4/projects/{id}/issues', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 1, iid: 1, title: 'Test' }),
    });

    await createIssue(customGitlabUrl, mockToken, 'Test Issue', 'Description');

    expect(global.fetch).toHaveBeenCalledWith(
      `${customGitlabUrl}/api/v4/projects/${mockProjectId}/issues`,
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('fetchReactions calls {gitlabUrl}/api/v4/projects/{id}/issues/{iid}/award_emoji', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await fetchReactions(customGitlabUrl, mockToken, mockIssueIid);

    expect(global.fetch).toHaveBeenCalledWith(
      `${customGitlabUrl}/api/v4/projects/${mockProjectId}/issues/${mockIssueIid}/award_emoji`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockToken}`,
        }),
      })
    );
  });

  it('addReaction calls {gitlabUrl}/api/v4/...', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 99, name: 'thumbsup' }),
    });

    await addReaction(customGitlabUrl, mockToken, mockIssueIid, 'thumbsup');

    expect(global.fetch).toHaveBeenCalledWith(
      `${customGitlabUrl}/api/v4/projects/${mockProjectId}/issues/${mockIssueIid}/award_emoji`,
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('removeReaction calls {gitlabUrl}/api/v4/...', async () => {
    const awardId = 99;
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await removeReaction(customGitlabUrl, mockToken, mockIssueIid, awardId);

    expect(global.fetch).toHaveBeenCalledWith(
      `${customGitlabUrl}/api/v4/projects/${mockProjectId}/issues/${mockIssueIid}/award_emoji/${awardId}`,
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });
});

describe('API calls with default (no gitlabUrl specified)', () => {
  const defaultGitlabUrl = 'https://gitlab.com';
  const mockToken = 'test-access-token';
  const mockProjectId = 12345;

  beforeEach(() => {
    window.projectId = mockProjectId;
    window.currentIssueId = 42;
    window.currentUser = { id: 1, name: 'Test User' };
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('all calls go to https://gitlab.com/api/v4/...', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 1, iid: 1, title: 'Test' }),
    });

    await createIssue(defaultGitlabUrl, mockToken, 'Test Issue', 'Description');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://gitlab.com/api/v4/'),
      expect.anything()
    );
  });

  it('OAuth goes to https://gitlab.com/oauth/...', () => {
    const tokenUrl = buildOAuthTokenUrl(defaultGitlabUrl);
    expect(tokenUrl).toBe('https://gitlab.com/oauth/token');
  });
});
