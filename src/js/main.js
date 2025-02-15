import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import SimpleMDE from "simplemde";

// Define our issue fetch strategies
const IssueFetchStrategy = {
  URL: 'url',
  PAGE_TITLE: 'pageTitle',
  ISSUE_ID: 'issueId'
};

// Helper to create a marked instance with highlight support
function createMarked() {
  const markedInstance = new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    })
  );
  markedInstance.setOptions({
    highlight: function (code, lang) {
      return hljs.highlight(lang, code).value;
    }
  });
  return markedInstance;
}

/**
 * Main initialization function.
 * Accepts an optional config object with keys:
 * - clientId
 * - redirectUri
 * - localStorageKey
 * - projectName
 * - issueMappingStrategy
 */
export async function init(config = {}) {
  // Default configuration values
  const defaultConfig = {
    clientId: 'b13dc0c7b49e390d25c1278061c48ca938c5f48b72a6ec8f6e5d87c9d0cafc19',
    redirectUri: window.location.origin, // default to current origin
    localStorageKey: 'gitlabAccessToken',
    projectName: 'antonbelev.gitlab.io',
    issueMappingStrategy: IssueFetchStrategy.URL
  };

  // Merge user config with defaults
  const cfg = Object.assign({}, defaultConfig, config);

  // Setup our configuration objects
  const GitLabIssuesConfig = {
    clientId: cfg.clientId,
    redirectUri: cfg.redirectUri,
    localStorageKey: cfg.localStorageKey,
  };

  const projectName = cfg.projectName;
  const issueMappingStrategy = cfg.issueMappingStrategy;

  let projectId = null;
  let currentIssueId = null;
  const markedInstance = createMarked();

  // Initialize SimpleMDE on the textarea with id "newComment"
  const simplemde = new SimpleMDE({
    element: document.getElementById("newComment"),
    hideIcons: ["preview", "side-by-side"],
    renderingConfig: {
      codeSyntaxHighlighting: true,
    },
    tabSize: 4,
  });

  // ---------------------------
  // Helper functions (authentication, fetching, UI updates, etc.)
  // ---------------------------

  function authenticateWithGitLab() {
    const oauthUrl = `https://gitlab.com/oauth/authorize?client_id=${GitLabIssuesConfig.clientId}&redirect_uri=${GitLabIssuesConfig.redirectUri}&response_type=code`;
    window.location.href = oauthUrl;
  }

  function showAuthButton() {
    const authButtonContainer = document.querySelector('.gitlab-button-container');
    if (authButtonContainer) {
      authButtonContainer.style.display = 'block';
    }
  }

  function hideAuthButton() {
    const authButtonContainer = document.querySelector('.gitlab-button-container');
    if (authButtonContainer) {
      authButtonContainer.style.display = 'none';
    }
  }

  async function requestAccessToken(code) {
    const tokenUrl = 'https://gitlab.com/oauth/token';
    const params = {
      client_id: GitLabIssuesConfig.clientId,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: GitLabIssuesConfig.redirectUri
    };

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Failed to get access token');
      const data = await response.json();
      const accessToken = data.access_token;
      localStorage.setItem(GitLabIssuesConfig.localStorageKey, accessToken);
      hideAuthButton();
      await fetchProjectId(accessToken);
    } catch (error) {
      console.error('Error requesting access token:', error);
    }
  }

  async function fetchProjectId(accessToken) {
    try {
      const projectsUrl = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(projectName)}`;
      const response = await fetch(projectsUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(GitLabIssuesConfig.localStorageKey);
          showAuthButton();
        }
        throw new Error('Failed to fetch projects');
      }
      const projects = await response.json();
      const project = projects.find(p => p.name === projectName);
      if (!project) throw new Error(`Project "${projectName}" not found`);
      projectId = project.id;
      await fetchIssuesByCriteria(accessToken, IssueFetchStrategy.ISSUE_ID);
    } catch (error) {
      console.error('Error fetching project ID:', error);
    }
  }

  async function fetchGitLabIssue(projectId, accessToken, fetchType, fetchParam) {
    try {
      let apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/issues`;
      if (fetchType === IssueFetchStrategy.URL) {
        apiUrl += `?search=${encodeURIComponent(fetchParam)}`;
      } else if (fetchType === IssueFetchStrategy.PAGE_TITLE) {
        apiUrl += `?search=${encodeURIComponent(fetchParam.split('/').pop())}`;
      } else if (fetchType === IssueFetchStrategy.ISSUE_ID) {
        apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/issues/${fetchParam}`;
      }
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(GitLabIssuesConfig.localStorageKey);
        }
        throw new Error('Failed to fetch issues, status: ' + response.status);
      }
      const issueJson = await response.json();
      currentIssueId = issueJson.iid;
      await displayIssue(issueJson, accessToken);
    } catch (error) {
      console.error('Error fetching issues:', error);
    }
  }

  async function fetchIssuesByCriteria(accessToken, fetchStrategy) {
    try {
      showLoadingOverlay();
      const currentUrl = window.location.href;
      const currentUrlTitle = document.title;
      const issueId = '1'; // example issue ID
      if (fetchStrategy === IssueFetchStrategy.URL) {
        await fetchGitLabIssue(projectId, accessToken, IssueFetchStrategy.URL, currentUrl);
      } else if (fetchStrategy === IssueFetchStrategy.PAGE_TITLE) {
        await fetchGitLabIssue(projectId, accessToken, IssueFetchStrategy.PAGE_TITLE, currentUrlTitle);
      } else if (fetchStrategy === IssueFetchStrategy.ISSUE_ID) {
        await fetchGitLabIssue(projectId, accessToken, IssueFetchStrategy.ISSUE_ID, issueId);
      } else {
        console.error('Invalid fetch strategy');
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      hideLoadingOverlay();
    }
  }

  async function fetchIssueDiscussions(issueIid, accessToken) {
    try {
      const response = await fetch(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issueIid}/discussions`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(GitLabIssuesConfig.localStorageKey);
        }
        throw new Error('Failed to fetch discussions for issue');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching discussions for issue:', error);
      return [];
    }
  }

  async function displayIssue(issue, accessToken) {
    const issuesContainer = document.getElementById('issuesContainer');
    issuesContainer.innerHTML = '';
    if (!issue) {
      const errorMessage = document.createElement('div');
      errorMessage.textContent = 'Failed to fetch GitLab issue.';
      issuesContainer.appendChild(errorMessage);
      return;
    }
    const totalComments = issue.user_notes_count;
    const commentsLabel = document.createElement('div');
    commentsLabel.classList.add('comments-label');
    commentsLabel.textContent = `${totalComments} Comments - powered by BeBlob`;
    issuesContainer.appendChild(commentsLabel);
    const issueElement = document.createElement('div');
    issueElement.classList.add('issue');
    const descriptionElement = document.createElement('div');
    descriptionElement.classList.add('issue-description');
    descriptionElement.textContent = issue.title;
    issueElement.appendChild(descriptionElement);
    const discussions = await fetchIssueDiscussions(issue.iid, accessToken);
    if (Array.isArray(discussions)) {
      discussions.forEach(discussion => {
        discussion.notes.forEach((note, index) => {
          const isIndented = index > 0 && note.type === "DiscussionNote";
          const commentElement = createCommentElement(note, isIndented);
          issueElement.appendChild(commentElement);
        });
      });
    }
    if (discussions.length === 0) {
      const noCommentsElement = document.createElement('div');
      noCommentsElement.textContent = 'No comments';
      issueElement.appendChild(noCommentsElement);
    }
    issuesContainer.appendChild(issueElement);
  }

  function createCommentElement(comment, isIndented) {
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');
    if (isIndented) {
      commentElement.style.marginLeft = '30px';
    }
    const headerElement = document.createElement('div');
    headerElement.classList.add('comment-header');
    const authorAvatar = document.createElement('img');
    authorAvatar.src = comment.author.avatar_url;
    authorAvatar.alt = comment.author.name;
    headerElement.appendChild(authorAvatar);
    const authorInfo = document.createElement('div');
    authorInfo.classList.add('author-info');
    const authorLink = document.createElement('a');
    authorLink.href = comment.author.web_url;
    authorLink.textContent = comment.author.name;
    authorLink.classList.add('author-name');
    authorInfo.appendChild(authorLink);
    const commentedOn = document.createElement('span');
    commentedOn.classList.add('commented-on');
    commentedOn.textContent = ' commented on ';
    authorInfo.appendChild(commentedOn);
    const timestamp = document.createElement('span');
    timestamp.classList.add('comment-timestamp');
    const commentDate = new Date(comment.created_at);
    timestamp.textContent = commentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    authorInfo.appendChild(timestamp);
    headerElement.appendChild(authorInfo);
    commentElement.appendChild(headerElement);
    const bodyElement = document.createElement('div');
    bodyElement.classList.add('comment-body');
    bodyElement.innerHTML = markedInstance.parse(comment.body);
    commentElement.appendChild(bodyElement);
    return commentElement;
  }

  async function fetchCurrentUser(accessToken) {
    try {
      const currentUserUrl = 'https://gitlab.com/api/v4/user';
      const response = await fetch(currentUserUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(GitLabIssuesConfig.localStorageKey);
        }
        throw new Error('Failed to fetch current user');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  function displayCurrentUserAvatar(user) {
    const currentUserAvatarContainer = document.createElement('div');
    currentUserAvatarContainer.classList.add('current-user-avatar-container');
    const avatarImg = document.createElement('img');
    avatarImg.src = user.avatar_url;
    avatarImg.alt = user.name;
    currentUserAvatarContainer.appendChild(avatarImg);
    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('bubble');
    currentUserAvatarContainer.appendChild(bubbleElement);
    const textareaContainer = document.querySelector('.comment-textarea-container');
    textareaContainer.insertBefore(currentUserAvatarContainer, textareaContainer.firstChild);
  }

  function showLoadingOverlay() {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'flex';
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'none';
  }

  function openTab(tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
      tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    document.querySelector(`button[data-tab="${tabName}"]`).classList.add("active");
    if (tabName === 'Preview') {
      updatePreview();
    }
  }

  function updatePreview() {
    const markdownContent = simplemde.value();
    const previewContent = document.getElementById("previewContent");
    previewContent.innerHTML = markedInstance.parse(markdownContent);
  }

  async function addCommentToIssue(accessToken, commentBody) {
    try {
      const apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/issues/${currentIssueId}/notes`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body: commentBody })
      });
      if (!response.ok) throw new Error('Failed to add comment to issue');
      return await response.json();
    } catch (error) {
      console.error('Error adding comment to issue:', error);
    }
  }

  // ---------------------------
  // Attach event listeners
  // ---------------------------
  document.getElementById("addCommentButton").addEventListener("click", async () => {
    const newComment = simplemde.value();
    const storedToken = localStorage.getItem(GitLabIssuesConfig.localStorageKey);
    if (!storedToken) {
      console.error('Access token not found');
      return;
    }
    if (!projectId || !currentIssueId) {
      console.error('Project ID or Issue ID not found');
      return;
    }
    await addCommentToIssue(storedToken, newComment);
    simplemde.value("");
    await fetchIssuesByCriteria(storedToken, IssueFetchStrategy.ISSUE_ID);
  });

  document.querySelectorAll('.tablinks').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      openTab(tabName);
    });
  });

  const authButton = document.getElementById('authButton');
  if (authButton) {
    authButton.style.display = 'block';
    authButton.addEventListener('click', authenticateWithGitLab);
  }

  const storedToken = localStorage.getItem(GitLabIssuesConfig.localStorageKey);
  if (storedToken) {
    hideAuthButton();
    await fetchProjectId(storedToken);
    const user = await fetchCurrentUser(storedToken);
    if (user) {
      displayCurrentUserAvatar(user);
    }
  } else {
    showAuthButton();
  }

  async function handleGitLabRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      await requestAccessToken(code);
    }
  }

  async function checkForOAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
      await handleGitLabRedirect();
    }
  }

  await checkForOAuthRedirect();
}

// If the script is loaded with data attributes, auto‑initialize:
if (document.currentScript && document.currentScript.dataset) {
  const dataset = document.currentScript.dataset;
  const autoConfig = {
    clientId: dataset.clientId,
    redirectUri: dataset.redirectUri,
    localStorageKey: dataset.localStorageKey,
    projectName: dataset.projectName,
    issueMappingStrategy: dataset.issueMappingStrategy
  };
  // Remove undefined keys
  Object.keys(autoConfig).forEach(key => {
    if (autoConfig[key] === undefined) delete autoConfig[key];
  });
  init(autoConfig);
}
