import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import SimpleMDE from 'simplemde';

// Define our issue fetch strategies
const IssueFetchStrategy = {
  URL: 'url',
  PAGE_TITLE: 'pageTitle',
  ISSUE_ID: 'issueId',
};

// Use a fixed local storage key for BeBlob
const LOCAL_STORAGE_KEY = 'beblobAccessToken';

// Pre-defined reaction options – using "tada" for the party popper emoji.
const predefinedReactions = [
  'thumbsup',
  'thumbsdown',
  'heart',
  'tada',
  'confused',
];
// Mapping from reaction name to its emoji representation.
const emojiMap = {
  thumbsup: '👍',
  thumbsdown: '👎',
  heart: '❤️',
  tada: '🎉',
  confused: '😕',
};

// Helper to create a marked instance with syntax highlighting
function createMarked() {
  const markedInstance = new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
    })
  );
  markedInstance.setOptions({
    highlight: function (code, lang) {
      return hljs.highlight(lang, code).value;
    },
  });
  return markedInstance;
}

// Helper function to inject an external CSS file if not already present
function injectCSS(href, id) {
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.id = id;
    document.head.appendChild(link);
    console.log('BeBlob: Injected CSS:', href);
  } else {
    console.log('BeBlob: CSS already present:', href);
  }
}

// Helper: return asset URL based on config.devMode. For production, it returns a URL from unpkg using the specified version.
function getAssetUrl(path, config) {
  if (config.devMode === 'true' || config.devMode === true) {
    return `/${path}`; // Assumes local files are served from the root.
  } else {
    return `https://unpkg.com/beblob@${config.beblobVersion}/dist/${path}`;
  }
}

function injectBeBlobCSS(config) {
  // For local development, use the local CSS file.
  if (config.devMode === 'true' || config.devMode === true) {
    injectCSS('/css/styles.css', 'beblob-css');
  } else {
    // In production, load the CSS from unpkg.com using the specified version.
    injectCSS(getAssetUrl('css/styles.css', config), 'beblob-css');
  }
  injectCSS(
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css',
    'hljs-css'
  );
  injectCSS(
    'https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css',
    'simplemde-css'
  );
}

// Function to inject the UI into #beblob_thread
function injectBeBlobUI(config) {
  const container = document.getElementById('beblob_thread');
  if (container) {
    container.innerHTML = `
      <div class="beblob-widget">
        <h1>Comments:</h1>
        <!-- Reactions section placed above the issue details -->
        <div id="reactionsContainer" class="reactions-bar"></div>
        <div id="issuesContainer">
          <!-- Issue details and comments will be displayed here -->
        </div>
        <div id="overlay" class="overlay" style="display: none;">
          <div class="overlay-text">Loading comments...</div>
        </div>
        <div class="comment-textarea-container">
          <div class="tab">
            <button class="tablinks gl-button" data-tab="Markdown">Markdown</button>
            <button class="tablinks gl-button" data-tab="Preview">Preview</button>
          </div>
          <div id="Markdown" class="tabcontent">
            <textarea id="newComment" class="comment-textarea" placeholder="Add a new comment..."></textarea>
          </div>
          <div id="Preview" class="tabcontent" style="display: none;">
            <div id="previewContent"></div>
          </div>
          <div class="comment-actions">
            <button id="addCommentButton" class="gl-button">Add Comment</button>
            <button id="authButton" class="gitlab-button">
              <img src="${getAssetUrl('images/gitlab-logo-500.svg', config)}" alt="GitLab Logo" class="gitlab-logo">
              Authenticate with GitLab
            </button>
          </div>
        </div>
      </div>
    `;
    console.log('BeBlob: UI injected into #beblob_thread');
  } else {
    console.error(
      "BeBlob: Container #beblob_thread not found. Please include <div id='beblob_thread'></div> in your HTML."
    );
  }
}

// ... [Rest of the code remains largely unchanged.]
// (For brevity, the functions for createIssue, fetchReactions, addReaction, removeReaction, toggleReaction, renderReactions, displayIssue, createCommentElement, fetchCurrentUser, displayCurrentUserAvatar, showLoadingOverlay, hideLoadingOverlay, openTab, updatePreview, addCommentToIssue, and OAuth handling remain the same as in your previous version, with one change in renderBeBlobUI() and injectBeBlobCSS() using getAssetUrl().)

async function createIssue(accessToken, title, description) {
  console.log('BeBlob: Creating new issue with title:', title);
  try {
    const apiUrl = `https://gitlab.com/api/v4/projects/${window.projectId}/issues`;
    const body = { title: title, description: description || '' };
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error('Failed to create issue, status: ' + response.status);
    }
    const issue = await response.json();
    console.log('BeBlob: Issue created successfully', issue);
    return issue;
  } catch (error) {
    console.error('BeBlob error creating issue:', error);
    return null;
  }
}

async function fetchReactions(accessToken, issueIid) {
  console.log('BeBlob: Fetching reactions for issue', issueIid);
  try {
    const apiUrl = `https://gitlab.com/api/v4/projects/${window.projectId}/issues/${issueIid}/award_emoji`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch reactions, status: ' + response.status);
    }
    const reactions = await response.json();
    console.log('BeBlob: Reactions fetched:', reactions);
    return reactions;
  } catch (error) {
    console.error('BeBlob error fetching reactions:', error);
    return [];
  }
}

async function addReaction(accessToken, issueIid, reactionName) {
  console.log('BeBlob: Adding reaction', reactionName, 'to issue', issueIid);
  try {
    const apiUrl = `https://gitlab.com/api/v4/projects/${window.projectId}/issues/${issueIid}/award_emoji`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: reactionName }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const reaction = await response.json();
    console.log('BeBlob: Reaction added:', reaction);
    return reaction;
  } catch (error) {
    console.error('BeBlob error adding reaction:', error);
    throw error;
  }
}

async function removeReaction(accessToken, issueIid, awardId) {
  console.log('BeBlob: Removing reaction, awardId:', awardId);
  try {
    const apiUrl = `https://gitlab.com/api/v4/projects/${window.projectId}/issues/${issueIid}/award_emoji/${awardId}`;
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error('Failed to remove reaction, status: ' + response.status);
    }
    console.log('BeBlob: Reaction removed');
    return true;
  } catch (error) {
    console.error('BeBlob error removing reaction:', error);
    return false;
  }
}

async function toggleReaction(name, accessToken, issueIid) {
  if (!window.currentUser) {
    await fetchCurrentUser(accessToken);
  }
  const updatedReactions = await fetchReactions(accessToken, issueIid);
  const existing = updatedReactions.find(
    (r) => r.name === name && r.user && r.user.id === window.currentUser.id
  );
  if (existing) {
    await removeReaction(accessToken, issueIid, existing.id);
  } else {
    try {
      await addReaction(accessToken, issueIid, name);
    } catch (err) {
      if (err.message.indexOf('already been taken') !== -1) {
        const updatedReactions2 = await fetchReactions(accessToken, issueIid);
        const duplicate = updatedReactions2.find(
          (r) =>
            r.name === name && r.user && r.user.id === window.currentUser.id
        );
        if (duplicate) {
          await removeReaction(accessToken, issueIid, duplicate.id);
        }
      } else {
        console.error('Error toggling reaction:', err);
      }
    }
  }
  const newReactions = await fetchReactions(accessToken, issueIid);
  renderReactions(newReactions, accessToken, issueIid);
}

function renderReactions(reactions, accessToken, issueIid) {
  const container = document.getElementById('reactionsContainer');
  if (!container) {
    console.error('BeBlob: Reactions container not found.');
    return;
  }
  container.innerHTML = '';

  const centerDiv = document.createElement('div');
  centerDiv.className = 'reactions-center';

  let reactionData = {};
  reactions.forEach((r) => {
    const name = r.name;
    if (!reactionData[name]) {
      reactionData[name] = { count: 0, myAwardId: null };
    }
    reactionData[name].count++;
    if (window.currentUser && r.user && r.user.id === window.currentUser.id) {
      reactionData[name].myAwardId = r.id;
    }
  });

  ['thumbsup', 'thumbsdown'].forEach((name) => {
    const data = reactionData[name] || { count: 0, myAwardId: null };
    const btn = document.createElement('button');
    btn.className = 'reaction-btn';
    btn.innerHTML = `<span class="gl-button-text">${emojiMap[name]}</span> <span class="reaction-count">${data.count}</span>`;
    btn.addEventListener('click', async () => {
      await toggleReaction(name, accessToken, issueIid);
    });
    centerDiv.appendChild(btn);
  });

  Object.keys(reactionData).forEach((name) => {
    if (
      name !== 'thumbsup' &&
      name !== 'thumbsdown' &&
      reactionData[name].count > 0
    ) {
      const data = reactionData[name];
      const btn = document.createElement('button');
      btn.className = 'reaction-btn';
      btn.innerHTML = `<span class="gl-button-text">${emojiMap[name]}</span> <span class="reaction-count">${data.count}</span>`;
      btn.addEventListener('click', async () => {
        await toggleReaction(name, accessToken, issueIid);
      });
      centerDiv.appendChild(btn);
    }
  });

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'reaction-toggle-btn';
  toggleBtn.innerHTML = `<span class="gl-button-text">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 1a11 11 0 1 0 11 11A11.013 11.013 0 0 0 12 1zm0 20a9 9 0 1 1 9-9 9.01 9.01 0 0 1-9 9zM8 11V9a1 1 0 0 1 2 0v2a1 1 0 0 1-2 0zm8-2v2a1 1 0 0 1-2 0V9a1 1 0 0 1 2 0zm-8 5h8a4 4 0 0 1-8 0z"/>
    </svg>
  </span>`;
  centerDiv.appendChild(toggleBtn);

  container.innerHTML = '';
  container.appendChild(centerDiv);

  let popup = document.getElementById('reaction-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'reaction-popup';
    popup.style.display = 'none';
    popup.style.position = 'absolute';
    popup.style.zIndex = 1000;
    document.body.appendChild(popup);
  }

  toggleBtn.addEventListener('click', () => {
    if (popup.style.display === 'none') {
      popup.innerHTML = '';
      predefinedReactions.forEach((name) => {
        const btn = document.createElement('button');
        btn.className = 'reaction-popup-btn';
        btn.innerHTML = `<span class="gl-button-text">${emojiMap[name]}</span>`;
        btn.addEventListener('click', async () => {
          await toggleReaction(name, accessToken, issueIid);
          popup.style.display = 'none';
        });
        popup.appendChild(btn);
      });
      const rect = toggleBtn.getBoundingClientRect();
      popup.style.top = rect.bottom + window.scrollY + 'px';
      popup.style.left = rect.left + window.scrollX + 'px';
      popup.style.display = 'block';
    } else {
      popup.style.display = 'none';
    }
  });

  console.log('BeBlob: Reactions rendered');
}

async function init(config) {
  console.log('BeBlob: Starting initialization...');
  if (
    !config ||
    !config.clientId ||
    !config.redirectUri ||
    !config.projectName ||
    !config.issueMappingStrategy
  ) {
    console.error(
      'BeBlob init error: Missing required configuration. Provided config:',
      config
    );
    throw new Error('Missing required BeBlob configuration');
  }
  console.log('BeBlob: Config validated', config);

  // Inject CSS and UI using our config
  injectBeBlobCSS(config);
  injectBeBlobUI(config);

  const markedInstance = createMarked();

  // Initialize the SimpleMDE editor for Markdown input
  const textarea = document.getElementById('newComment');
  if (!textarea) {
    console.error("BeBlob error: 'newComment' textarea not found.");
    return;
  }
  const simplemde = new SimpleMDE({
    element: textarea,
    hideIcons: ['preview', 'side-by-side'],
    renderingConfig: { codeSyntaxHighlighting: true },
    tabSize: 4,
  });
  console.log('BeBlob: SimpleMDE editor initialized');

  // --- OAuth Handling with Static Callback URL & State Parameter ---
  function authenticateWithGitLab() {
    const staticRedirectUri = config.redirectUri;
    const originalUrl = window.location.href;
    const state = encodeURIComponent(originalUrl);
    const oauthUrl = `https://gitlab.com/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(staticRedirectUri)}&response_type=code&state=${state}`;
    console.log('BeBlob: Redirecting to GitLab OAuth:', oauthUrl);
    window.location.href = oauthUrl;
  }

  // New: Update the auth button text and functionality based on login state.
  function updateAuthButton() {
    const authButton = document.getElementById('authButton');
    const addCommentButton = document.getElementById('addCommentButton');
    const storedToken = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedToken) {
      // If logged in, show logout (no icon) and enable add comment
      authButton.innerHTML = 'Logout';
      addCommentButton.disabled = false;
    } else {
      // If not logged in, show the login button with GitLab icon and disable add comment
      authButton.innerHTML = `<img src="${getAssetUrl('images/gitlab-logo-500.svg', config)}" alt="GitLab Logo" class="gitlab-logo">
      Authenticate with GitLab`;
      addCommentButton.disabled = true;
    }
  }

  // Attach event listener to auth button for login/logout behavior.
  const authButton = document.getElementById('authButton');
  if (authButton) {
    authButton.addEventListener('click', () => {
      const storedToken = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedToken) {
        // Logout: clear token and remove query params, then reload
        localStorage.removeItem(LOCAL_STORAGE_KEY);

        // Remove 'code' and 'state' query parameters from the URL.
        const url = new URL(window.location);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.toString());

        window.location.reload();
      } else {
        // Login
        authenticateWithGitLab();
      }
    });
    console.log('BeBlob: Auth button event listener attached');
  } else {
    console.error('BeBlob error: Auth button not found');
  }

  // Attach event listener to Add Comment button
  const addCommentButton = document.getElementById('addCommentButton');
  if (addCommentButton) {
    addCommentButton.addEventListener('click', async () => {
      console.log("BeBlob: 'Add Comment' button clicked");
      const newComment = simplemde.value();
      const storedToken = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!storedToken) {
        console.error('BeBlob error: Access token not found');
        return;
      }
      if (!window.projectId || !window.currentIssueId) {
        console.error('BeBlob error: Project ID or Issue ID not found');
        return;
      }
      await addCommentToIssue(storedToken, newComment);
      simplemde.value('');
      await fetchIssuesByCriteria(storedToken, config.issueMappingStrategy);
    });
  } else {
    console.error("BeBlob error: 'Add Comment' button not found");
  }

  // Set initial state for buttons based on login status.
  updateAuthButton();

  const tablinks = document.querySelectorAll('.tablinks');
  if (tablinks) {
    tablinks.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        openTab(tabName);
      });
    });
    console.log('BeBlob: Tab event listeners attached');
  } else {
    console.error('BeBlob error: No tab links found');
  }

  const storedToken = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedToken) {
    console.log('BeBlob: Found stored token, proceeding with project fetch');
    // Hide auth button is not needed since the same button is used for logout.
    await fetchProjectId(storedToken);
    const user = await fetchCurrentUser(storedToken);
    if (user) {
      displayCurrentUserAvatar(user);
    }
  } else {
    console.log('BeBlob: No stored token found');
  }

  async function requestAccessToken(code) {
    console.log('BeBlob: Requesting access token...');
    const tokenUrl = 'https://gitlab.com/oauth/token';
    const params = {
      client_id: config.clientId,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    };
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error('Failed to get access token');
      const data = await response.json();
      const accessToken = data.access_token;
      localStorage.setItem(LOCAL_STORAGE_KEY, accessToken);
      console.log('BeBlob: Access token received');
      updateAuthButton();
      await fetchProjectId(accessToken);
    } catch (error) {
      console.error('BeBlob error requesting access token:', error);
    }
  }

  async function fetchProjectId(accessToken) {
    console.log('BeBlob: Fetching project ID for project:', config.projectName);
    try {
      const projectsUrl = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(config.projectName)}`;
      const response = await fetch(projectsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          updateAuthButton();
        }
        throw new Error('Failed to fetch projects');
      }
      const projects = await response.json();
      const project = projects.find((p) => p.name === config.projectName);
      if (!project)
        throw new Error(`Project "${config.projectName}" not found`);
      window.projectId = project.id;
      console.log('BeBlob: Project ID found:', window.projectId);
      await fetchIssuesByCriteria(accessToken, config.issueMappingStrategy);
    } catch (error) {
      console.error('BeBlob error fetching project ID:', error);
    }
  }

  async function fetchIssuesByCriteria(accessToken, fetchStrategy) {
    console.log('BeBlob: Fetching issues by criteria', fetchStrategy);
    try {
      showLoadingOverlay();
      let issue = null;
      if (fetchStrategy === IssueFetchStrategy.URL) {
        issue = await fetchGitLabIssue(
          window.projectId,
          accessToken,
          IssueFetchStrategy.URL,
          window.location.href
        );
      } else if (fetchStrategy === IssueFetchStrategy.PAGE_TITLE) {
        issue = await fetchGitLabIssue(
          window.projectId,
          accessToken,
          IssueFetchStrategy.PAGE_TITLE,
          document.title
        );
      } else if (fetchStrategy === IssueFetchStrategy.ISSUE_ID) {
        if (!config.issueId) {
          console.error(
            "BeBlob error: issueMappingStrategy is 'issueId' but no issueId was provided in configuration."
          );
          throw new Error('Missing required configuration: issueId');
        }
        issue = await fetchGitLabIssue(
          window.projectId,
          accessToken,
          IssueFetchStrategy.ISSUE_ID,
          config.issueId
        );
      } else {
        console.error('BeBlob error: Invalid fetch strategy');
      }
      if (
        !issue &&
        (fetchStrategy === IssueFetchStrategy.URL ||
          fetchStrategy === IssueFetchStrategy.PAGE_TITLE)
      ) {
        console.log('BeBlob: No issue found. Creating a new issue...');
        issue = await createIssue(
          accessToken,
          document.title,
          'Automatically created by BeBlob.'
        );
        if (issue) {
          window.currentIssueId = issue.iid;
          await displayIssue(issue, accessToken);
        }
      }
    } catch (error) {
      console.error('BeBlob error fetching issues by criteria:', error);
    } finally {
      hideLoadingOverlay();
    }
  }

  async function fetchGitLabIssue(
    projectId,
    accessToken,
    fetchType,
    fetchParam
  ) {
    console.log(
      `BeBlob: Fetching issue (type: ${fetchType}) with parameter:`,
      fetchParam
    );
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
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          updateAuthButton();
        }
        throw new Error('Failed to fetch issues, status: ' + response.status);
      }
      const data = await response.json();
      let issueJson = null;
      if (Array.isArray(data)) {
        if (data.length > 0) {
          issueJson = data[0];
        }
      } else {
        issueJson = data;
      }
      if (issueJson) {
        window.currentIssueId = issueJson.iid;
        console.log(
          'BeBlob: Issue fetched, currentIssueId:',
          window.currentIssueId
        );
        await displayIssue(issueJson, accessToken);
        return issueJson;
      } else {
        console.log('BeBlob: No matching issue found.');
        return null;
      }
    } catch (error) {
      console.error('BeBlob error fetching issue:', error);
      return null;
    }
  }

  async function fetchIssueDiscussions(issueIid, accessToken) {
    console.log('BeBlob: Fetching discussions for issue', issueIid);
    try {
      const response = await fetch(
        `https://gitlab.com/api/v4/projects/${window.projectId}/issues/${issueIid}/discussions`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          updateAuthButton();
        }
        throw new Error('Failed to fetch discussions for issue');
      }
      return await response.json();
    } catch (error) {
      console.error('BeBlob error fetching discussions:', error);
      return [];
    }
  }

  async function displayIssue(issue, accessToken) {
    console.log('BeBlob: Displaying issue', issue);
    const issuesContainer = document.getElementById('issuesContainer');
    issuesContainer.innerHTML = '';
    if (!issue) {
      const errorMessage = document.createElement('div');
      errorMessage.textContent = 'Failed to fetch GitLab issue.';
      issuesContainer.appendChild(errorMessage);
      return;
    }
    const commentsCount =
      issue.user_notes_count !== undefined ? issue.user_notes_count : 0;
    const commentsLabel = document.createElement('div');
    commentsLabel.classList.add('comments-label');
    commentsLabel.innerHTML = `${commentsCount} Comments - <a href="https://gitlab.com/antonbelev/beblob" target="_blank">powered by BeBlob</a>`;
    issuesContainer.appendChild(commentsLabel);
    const issueElement = document.createElement('div');
    issueElement.classList.add('issue');
    const descriptionElement = document.createElement('div');
    descriptionElement.classList.add('issue-description');
    descriptionElement.textContent = issue.title;
    issueElement.appendChild(descriptionElement);
    const discussions = await fetchIssueDiscussions(issue.iid, accessToken);
    if (Array.isArray(discussions)) {
      discussions.forEach((discussion) => {
        discussion.notes.forEach((note, index) => {
          const isIndented = index > 0 && note.type === 'DiscussionNote';
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
    const reactions = await fetchReactions(accessToken, issue.iid);
    renderReactions(reactions, accessToken, issue.iid);
    console.log('BeBlob: Issue display complete');
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
      day: 'numeric',
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
    console.log('BeBlob: Fetching current user...');
    try {
      const currentUserUrl = 'https://gitlab.com/api/v4/user';
      const response = await fetch(currentUserUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          updateAuthButton();
        }
        throw new Error('Failed to fetch current user');
      }
      const user = await response.json();
      console.log('BeBlob: Current user fetched', user);
      window.currentUser = user;
      return user;
    } catch (error) {
      console.error('BeBlob error fetching current user:', error);
      return null;
    }
  }

  function displayCurrentUserAvatar(user) {
    console.log('BeBlob: Displaying current user avatar');
    const currentUserAvatarContainer = document.createElement('div');
    currentUserAvatarContainer.classList.add('current-user-avatar-container');
    const avatarImg = document.createElement('img');
    avatarImg.src = user.avatar_url;
    avatarImg.alt = user.name;
    currentUserAvatarContainer.appendChild(avatarImg);
    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('bubble');
    currentUserAvatarContainer.appendChild(bubbleElement);
    const textareaContainer = document.querySelector(
      '.comment-textarea-container'
    );
    if (textareaContainer) {
      textareaContainer.insertBefore(
        currentUserAvatarContainer,
        textareaContainer.firstChild
      );
    }
  }

  function showLoadingOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      console.log('BeBlob: Showing loading overlay');
    }
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.style.display = 'none';
      console.log('BeBlob: Hiding loading overlay');
    }
  }

  function openTab(tabName) {
    const tabcontent = document.getElementsByClassName('tabcontent');
    for (let i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = 'none';
    }
    const tablinks = document.getElementsByClassName('tablinks');
    for (let i = 0; i < tablinks.length; i++) {
      tablinks[i].classList.remove('active');
    }
    const tabElement = document.getElementById(tabName);
    if (tabElement) {
      tabElement.style.display = 'block';
    }
    const tabButton = document.querySelector(`button[data-tab="${tabName}"]`);
    if (tabButton) {
      tabButton.classList.add('active');
    }
    if (tabName === 'Preview') {
      updatePreview();
    }
    console.log('BeBlob: Opened tab:', tabName);
  }

  function updatePreview() {
    const markdownContent = simplemde.value();
    const previewContent = document.getElementById('previewContent');
    if (previewContent) {
      previewContent.innerHTML = markedInstance.parse(markdownContent);
      console.log('BeBlob: Updated preview');
    }
  }

  async function addCommentToIssue(accessToken, commentBody) {
    console.log('BeBlob: Adding comment to issue...');
    try {
      const apiUrl = `https://gitlab.com/api/v4/projects/${window.projectId}/issues/${window.currentIssueId}/notes`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: commentBody }),
      });
      if (!response.ok) throw new Error('Failed to add comment to issue');
      console.log('BeBlob: Comment added successfully');
      return await response.json();
    } catch (error) {
      console.error('BeBlob error adding comment:', error);
    }
  }

  async function handleGitLabRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code) {
      console.log('BeBlob: Handling GitLab redirect with code:', code);
      await requestAccessToken(code);
      if (state) {
        const originalUrl = decodeURIComponent(state);
        const separator = originalUrl.includes('?') ? '&' : '?';
        const redirectUrl =
          originalUrl + separator + 'code=' + encodeURIComponent(code);
        console.log(
          'BeBlob: Redirecting back to original page with code:',
          redirectUrl
        );
        window.location.href = redirectUrl;
      }
    }
  }

  async function checkForOAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
      await handleGitLabRedirect();
    }
  }

  await checkForOAuthRedirect();
  console.log('BeBlob: Initialization complete');
}

// Auto-initialize by reading configuration from the script tag with ID 'beblob-script'
document.addEventListener('DOMContentLoaded', () => {
  const script = document.getElementById('beblob-script');
  if (script && script.dataset) {
    const autoConfig = {
      clientId: script.dataset.clientId,
      redirectUri: script.dataset.redirectUri,
      projectName: script.dataset.projectName,
      issueMappingStrategy: script.dataset.issueMappingStrategy,
      issueId: script.dataset.issueId, // Optional; required only if mapping strategy is "issueId"
      devMode: script.dataset.devMode, // "true" or "false"
      beblobVersion: script.dataset.beblobVersion, // e.g., "1.2.0"
    };
    if (
      !autoConfig.clientId ||
      !autoConfig.redirectUri ||
      !autoConfig.projectName ||
      !autoConfig.issueMappingStrategy
    ) {
      console.error(
        'BeBlob auto init error: Missing required configuration parameters:',
        autoConfig
      );
      throw new Error('Missing required BeBlob configuration in auto init');
    }
    console.log('BeBlob auto init: Found valid config', autoConfig);
    init(autoConfig).catch((err) => {
      console.error('BeBlob initialization failed:', err);
    });
  } else {
    console.error(
      'BeBlob auto init error: No configuration data attributes found in the script tag.'
    );
    throw new Error('Missing required BeBlob configuration in auto init');
  }
});
