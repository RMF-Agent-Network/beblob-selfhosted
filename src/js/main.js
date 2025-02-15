import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import SimpleMDE from "simplemde";

// Define our issue fetch strategies
const IssueFetchStrategy = {
  URL: "url",
  PAGE_TITLE: "pageTitle",
  ISSUE_ID: "issueId"
};

// Use a fixed local storage key for BeBlob
const LOCAL_STORAGE_KEY = "beblobAccessToken";

// Helper to create a marked instance with syntax highlighting
function createMarked() {
  const markedInstance = new Marked(
    markedHighlight({
      langPrefix: "hljs language-",
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
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

// Helper function to inject an external CSS file if not already present
function injectCSS(href, id) {
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.id = id;
    document.head.appendChild(link);
    console.log("BeBlob: Injected CSS:", href);
  } else {
    console.log("BeBlob: CSS already present:", href);
  }
}

// Function to inject all required CSS files
function injectBeBlobCSS() {
  injectCSS("https://unpkg.com/beblob@1.0.3/dist/css/styles.css", "beblob-css");
  injectCSS("https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css", "hljs-css");
  injectCSS("https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css", "simplemde-css");
}

// Function to inject the UI into the designated container (#beblob_thread)
function injectBeBlobUI() {
  const container = document.getElementById("beblob_thread");
  if (container) {
    container.innerHTML = `
      <div class="beblob-widget">
        <h1>GitLab Issues</h1>
        <div class="gitlab-button-container">
          <button id="authButton" class="gitlab-button">
            <img src="https://unpkg.com/beblob@1.0.3/dist/images/gitlab-logo-500.svg" alt="GitLab Logo" class="gitlab-logo">
            Authenticate with GitLab
          </button>
        </div>
        <div id="issuesContainer">
          <!-- Issues will be displayed here -->
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
          <button id="addCommentButton" class="gl-button">Add Comment</button>
        </div>
      </div>
    `;
    console.log("BeBlob: UI injected into #beblob_thread");
  } else {
    console.error("BeBlob: Container #beblob_thread not found. Please include <div id='beblob_thread'></div> in your HTML.");
  }
}

// New: Create an issue if none is found
async function createIssue(accessToken, title, description) {
  console.log("BeBlob: Creating new issue with title:", title);
  try {
    const apiUrl = `https://gitlab.com/api/v4/projects/${window.projectId}/issues`;
    const body = {
      title: title,
      description: description || ""
    };
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error("Failed to create issue, status: " + response.status);
    }
    const issue = await response.json();
    console.log("BeBlob: Issue created successfully", issue);
    return issue;
  } catch (error) {
    console.error("BeBlob error creating issue:", error);
    return null;
  }
}

// Main initialization function.
// It requires a full config object. If any required parameter is missing, the script logs an error and throws.
export async function init(config) {
  console.log("BeBlob: Starting initialization...");
  if (
    !config ||
    !config.clientId ||
    !config.redirectUri ||
    !config.projectName ||
    !config.issueMappingStrategy
  ) {
    console.error("BeBlob init error: Missing required configuration. Provided config:", config);
    throw new Error("Missing required BeBlob configuration");
  }
  console.log("BeBlob: Config validated", config);

  // Inject all CSS and the UI (into the provided container)
  injectBeBlobCSS();
  injectBeBlobUI();

  const markedInstance = createMarked();

  // Initialize the SimpleMDE editor for Markdown input
  const textarea = document.getElementById("newComment");
  if (!textarea) {
    console.error("BeBlob error: 'newComment' textarea not found.");
    return;
  }
  const simplemde = new SimpleMDE({
    element: textarea,
    hideIcons: ["preview", "side-by-side"],
    renderingConfig: {
      codeSyntaxHighlighting: true,
    },
    tabSize: 4,
  });
  console.log("BeBlob: SimpleMDE editor initialized");

  // --- OAuth Handling with Static Callback URL & State Parameter ---
  function authenticateWithGitLab() {
    const staticRedirectUri = config.redirectUri; // e.g. "http://localhost:4000/"
    const originalUrl = window.location.href; // current page URL
    const state = encodeURIComponent(originalUrl);
    const oauthUrl = `https://gitlab.com/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(staticRedirectUri)}&response_type=code&state=${state}`;
    console.log("BeBlob: Redirecting to GitLab OAuth:", oauthUrl);
    window.location.href = oauthUrl;
  }

  function showAuthButton() {
    const authButtonContainer = document.querySelector(".gitlab-button-container");
    if (authButtonContainer) {
      authButtonContainer.style.display = "block";
      console.log("BeBlob: Auth button displayed");
    }
  }

  function hideAuthButton() {
    const authButtonContainer = document.querySelector(".gitlab-button-container");
    if (authButtonContainer) {
      authButtonContainer.style.display = "none";
      console.log("BeBlob: Auth button hidden");
    }
  }

  async function requestAccessToken(code) {
    console.log("BeBlob: Requesting access token...");
    const tokenUrl = "https://gitlab.com/oauth/token";
    const params = {
      client_id: config.clientId,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri
    };
    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error("Failed to get access token");
      const data = await response.json();
      const accessToken = data.access_token;
      localStorage.setItem(LOCAL_STORAGE_KEY, accessToken);
      console.log("BeBlob: Access token received");
      hideAuthButton();
      await fetchIssuesByCriteria(accessToken, config.issueMappingStrategy);
    } catch (error) {
      console.error("BeBlob error requesting access token:", error);
    }
  }

  async function fetchProjectId(accessToken) {
    console.log("BeBlob: Fetching project ID for project:", config.projectName);
    try {
      const projectsUrl = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(config.projectName)}`;
      const response = await fetch(projectsUrl, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          showAuthButton();
        }
        throw new Error("Failed to fetch projects");
      }
      const projects = await response.json();
      const project = projects.find(p => p.name === config.projectName);
      if (!project) throw new Error(`Project "${config.projectName}" not found`);
      window.projectId = project.id;
      console.log("BeBlob: Project ID found:", window.projectId);
      await fetchIssuesByCriteria(accessToken, config.issueMappingStrategy);
    } catch (error) {
      console.error("BeBlob error fetching project ID:", error);
    }
  }

  // Updated fetchIssuesByCriteria now uses the provided mapping strategy.
  async function fetchIssuesByCriteria(accessToken, fetchStrategy) {
    console.log("BeBlob: Fetching issues by criteria", fetchStrategy);
    try {
      showLoadingOverlay();
      let issue = null;
      if (fetchStrategy === IssueFetchStrategy.URL) {
        issue = await fetchGitLabIssue(window.projectId, accessToken, IssueFetchStrategy.URL, window.location.href);
      } else if (fetchStrategy === IssueFetchStrategy.PAGE_TITLE) {
        issue = await fetchGitLabIssue(window.projectId, accessToken, IssueFetchStrategy.PAGE_TITLE, document.title);
      } else if (fetchStrategy === IssueFetchStrategy.ISSUE_ID) {
        if (!config.issueId) {
          console.error("BeBlob error: issueMappingStrategy is 'issueId' but no issueId was provided in configuration.");
          throw new Error("Missing required configuration: issueId");
        }
        issue = await fetchGitLabIssue(window.projectId, accessToken, IssueFetchStrategy.ISSUE_ID, config.issueId);
      } else {
        console.error("BeBlob error: Invalid fetch strategy");
      }
      // If no issue is found and strategy is URL or pageTitle, create one.
      if (!issue && (fetchStrategy === IssueFetchStrategy.URL || fetchStrategy === IssueFetchStrategy.PAGE_TITLE)) {
        console.log("BeBlob: No issue found. Creating a new issue...");
        issue = await createIssue(accessToken, document.title, "Automatically created by BeBlob.");
        if (issue) {
          window.currentIssueId = issue.iid;
          await displayIssue(issue, accessToken);
        }
      }
    } catch (error) {
      console.error("BeBlob error fetching issues by criteria:", error);
    } finally {
      hideLoadingOverlay();
    }
  }

  async function fetchGitLabIssue(projectId, accessToken, fetchType, fetchParam) {
    console.log(`BeBlob: Fetching issue (type: ${fetchType}) with parameter:`, fetchParam);
    try {
      let apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/issues`;
      if (fetchType === IssueFetchStrategy.URL) {
        apiUrl += `?search=${encodeURIComponent(fetchParam)}`;
      } else if (fetchType === IssueFetchStrategy.PAGE_TITLE) {
        apiUrl += `?search=${encodeURIComponent(fetchParam.split("/").pop())}`;
      } else if (fetchType === IssueFetchStrategy.ISSUE_ID) {
        apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/issues/${fetchParam}`;
      }
      const response = await fetch(apiUrl, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        throw new Error("Failed to fetch issues, status: " + response.status);
      }
      const data = await response.json();
      let issueJson = null;
      if (Array.isArray(data)) {
        if (data.length > 0) {
          issueJson = data[0]; // use first matching issue
        }
      } else {
        issueJson = data;
      }
      if (issueJson) {
        window.currentIssueId = issueJson.iid;
        console.log("BeBlob: Issue fetched, currentIssueId:", window.currentIssueId);
        await displayIssue(issueJson, accessToken);
        return issueJson;
      } else {
        console.log("BeBlob: No matching issue found.");
        return null;
      }
    } catch (error) {
      console.error("BeBlob error fetching issue:", error);
      return null;
    }
  }

  async function fetchIssueDiscussions(issueIid, accessToken) {
    console.log("BeBlob: Fetching discussions for issue", issueIid);
    try {
      const response = await fetch(`https://gitlab.com/api/v4/projects/${window.projectId}/issues/${issueIid}/discussions`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        throw new Error("Failed to fetch discussions for issue");
      }
      return await response.json();
    } catch (error) {
      console.error("BeBlob error fetching discussions:", error);
      return [];
    }
  }

  async function displayIssue(issue, accessToken) {
    console.log("BeBlob: Displaying issue", issue);
    const issuesContainer = document.getElementById("issuesContainer");
    issuesContainer.innerHTML = "";
    if (!issue) {
      const errorMessage = document.createElement("div");
      errorMessage.textContent = "Failed to fetch GitLab issue.";
      issuesContainer.appendChild(errorMessage);
      return;
    }
    const commentsCount = (issue.user_notes_count !== undefined) ? issue.user_notes_count : 0;
    const commentsLabel = document.createElement("div");
    commentsLabel.classList.add("comments-label");
    commentsLabel.innerHTML = `${commentsCount} Comments - <a href="https://gitlab.com/antonbelev/beblob" target="_blank">powered by BeBlob</a>`;
    issuesContainer.appendChild(commentsLabel);
    const issueElement = document.createElement("div");
    issueElement.classList.add("issue");
    const descriptionElement = document.createElement("div");
    descriptionElement.classList.add("issue-description");
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
      const noCommentsElement = document.createElement("div");
      noCommentsElement.textContent = "No comments yet. Be the first to share what you think!";
      issueElement.appendChild(noCommentsElement);
    }
    issuesContainer.appendChild(issueElement);
    console.log("BeBlob: Issue display complete");
  }

  function createCommentElement(comment, isIndented) {
    const commentElement = document.createElement("div");
    commentElement.classList.add("comment");
    if (isIndented) {
      commentElement.style.marginLeft = "30px";
    }
    const headerElement = document.createElement("div");
    headerElement.classList.add("comment-header");
    const authorAvatar = document.createElement("img");
    authorAvatar.src = comment.author.avatar_url;
    authorAvatar.alt = comment.author.name;
    headerElement.appendChild(authorAvatar);
    const authorInfo = document.createElement("div");
    authorInfo.classList.add("author-info");
    const authorLink = document.createElement("a");
    authorLink.href = comment.author.web_url;
    authorLink.textContent = comment.author.name;
    authorLink.classList.add("author-name");
    authorInfo.appendChild(authorLink);
    const commentedOn = document.createElement("span");
    commentedOn.classList.add("commented-on");
    commentedOn.textContent = " commented on ";
    authorInfo.appendChild(commentedOn);
    const timestamp = document.createElement("span");
    timestamp.classList.add("comment-timestamp");
    const commentDate = new Date(comment.created_at);
    timestamp.textContent = commentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    authorInfo.appendChild(timestamp);
    headerElement.appendChild(authorInfo);
    commentElement.appendChild(headerElement);
    const bodyElement = document.createElement("div");
    bodyElement.classList.add("comment-body");
    bodyElement.innerHTML = markedInstance.parse(comment.body);
    commentElement.appendChild(bodyElement);
    return commentElement;
  }

  async function fetchCurrentUser(accessToken) {
    console.log("BeBlob: Fetching current user...");
    try {
      const currentUserUrl = "https://gitlab.com/api/v4/user";
      const response = await fetch(currentUserUrl, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        throw new Error("Failed to fetch current user");
      }
      const user = await response.json();
      console.log("BeBlob: Current user fetched", user);
      return user;
    } catch (error) {
      console.error("BeBlob error fetching current user:", error);
      return null;
    }
  }

  function displayCurrentUserAvatar(user) {
    console.log("BeBlob: Displaying current user avatar");
    const currentUserAvatarContainer = document.createElement("div");
    currentUserAvatarContainer.classList.add("current-user-avatar-container");
    const avatarImg = document.createElement("img");
    avatarImg.src = user.avatar_url;
    avatarImg.alt = user.name;
    currentUserAvatarContainer.appendChild(avatarImg);
    const bubbleElement = document.createElement("div");
    bubbleElement.classList.add("bubble");
    currentUserAvatarContainer.appendChild(bubbleElement);
    const textareaContainer = document.querySelector(".comment-textarea-container");
    if (textareaContainer) {
      textareaContainer.insertBefore(currentUserAvatarContainer, textareaContainer.firstChild);
    }
  }

  function showLoadingOverlay() {
    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.style.display = "flex";
      console.log("BeBlob: Showing loading overlay");
    }
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.style.display = "none";
      console.log("BeBlob: Hiding loading overlay");
    }
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
    const tabElement = document.getElementById(tabName);
    if (tabElement) {
      tabElement.style.display = "block";
    }
    const tabButton = document.querySelector(`button[data-tab="${tabName}"]`);
    if (tabButton) {
      tabButton.classList.add("active");
    }
    if (tabName === "Preview") {
      updatePreview();
    }
    console.log("BeBlob: Opened tab:", tabName);
  }

  function updatePreview() {
    const markdownContent = simplemde.value();
    const previewContent = document.getElementById("previewContent");
    if (previewContent) {
      previewContent.innerHTML = markedInstance.parse(markdownContent);
      console.log("BeBlob: Updated preview");
    }
  }

  async function addCommentToIssue(accessToken, commentBody) {
    console.log("BeBlob: Adding comment to issue...");
    try {
      const apiUrl = `https://gitlab.com/api/v4/projects/${window.projectId}/issues/${window.currentIssueId}/notes`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ body: commentBody })
      });
      if (!response.ok) throw new Error("Failed to add comment to issue");
      console.log("BeBlob: Comment added successfully");
      return await response.json();
    } catch (error) {
      console.error("BeBlob error adding comment:", error);
    }
  }

  // Attach event listeners to UI elements
  const addCommentButton = document.getElementById("addCommentButton");
  if (addCommentButton) {
    addCommentButton.addEventListener("click", async () => {
      console.log("BeBlob: 'Add Comment' button clicked");
      const newComment = simplemde.value();
      const storedToken = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!storedToken) {
        console.error("BeBlob error: Access token not found");
        return;
      }
      if (!window.projectId || !window.currentIssueId) {
        console.error("BeBlob error: Project ID or Issue ID not found");
        return;
      }
      await addCommentToIssue(storedToken, newComment);
      simplemde.value("");
      await fetchIssuesByCriteria(storedToken, config.issueMappingStrategy);
    });
  } else {
    console.error("BeBlob error: 'Add Comment' button not found");
  }

  const tablinks = document.querySelectorAll(".tablinks");
  if (tablinks) {
    tablinks.forEach(tab => {
      tab.addEventListener("click", () => {
        const tabName = tab.getAttribute("data-tab");
        openTab(tabName);
      });
    });
    console.log("BeBlob: Tab event listeners attached");
  } else {
    console.error("BeBlob error: No tab links found");
  }

  const authButton = document.getElementById("authButton");
  if (authButton) {
    authButton.style.display = "block";
    authButton.addEventListener("click", authenticateWithGitLab);
    console.log("BeBlob: Auth button event listener attached");
  } else {
    console.error("BeBlob error: Auth button not found");
  }

  const storedToken = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedToken) {
    console.log("BeBlob: Found stored token, proceeding with project fetch");
    hideAuthButton();
    await fetchProjectId(storedToken);
    const user = await fetchCurrentUser(storedToken);
    if (user) {
      displayCurrentUserAvatar(user);
    }
  } else {
    console.log("BeBlob: No stored token found, showing auth button");
    showAuthButton();
  }

  async function handleGitLabRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    if (code) {
      console.log("BeBlob: Handling GitLab redirect with code:", code);
      await requestAccessToken(code);
      if (state) {
        const originalUrl = decodeURIComponent(state);
        // Append the code parameter so the original page can process it
        const separator = originalUrl.includes("?") ? "&" : "?";
        const redirectUrl = originalUrl + separator + "code=" + encodeURIComponent(code);
        console.log("BeBlob: Redirecting back to original page with code:", redirectUrl);
        window.location.href = redirectUrl;
      }
    }
  }

  async function checkForOAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("code")) {
      await handleGitLabRedirect();
    }
  }

  await checkForOAuthRedirect();
  console.log("BeBlob: Initialization complete");
}

// Auto-initialize by reading configuration from the script tag with ID 'beblob-script'
document.addEventListener("DOMContentLoaded", () => {
  const script = document.getElementById("beblob-script");
  if (script && script.dataset) {
    const autoConfig = {
      clientId: script.dataset.clientId,
      redirectUri: script.dataset.redirectUri,
      projectName: script.dataset.projectName,
      issueMappingStrategy: script.dataset.issueMappingStrategy,
      issueId: script.dataset.issueId // Optional; required only if mapping strategy is "issueId"
    };
    if (
      !autoConfig.clientId ||
      !autoConfig.redirectUri ||
      !autoConfig.projectName ||
      !autoConfig.issueMappingStrategy
    ) {
      console.error("BeBlob auto init error: Missing required configuration parameters:", autoConfig);
      throw new Error("Missing required BeBlob configuration in auto init");
    }
    console.log("BeBlob auto init: Found valid config", autoConfig);
    init(autoConfig).catch(err => {
      console.error("BeBlob initialization failed:", err);
    });
  } else {
    console.error("BeBlob auto init error: No configuration data attributes found in the script tag.");
    throw new Error("Missing required BeBlob configuration in auto init");
  }
});
