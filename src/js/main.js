import {Marked} from "marked";
import {markedHighlight} from "marked-highlight";
import hljs from 'highlight.js';
import SimpleMDE from "simplemde"

// Initialize SimpleMDE
const simplemde = new SimpleMDE({
    element: document.getElementById("newComment"), // ID of your textarea
    hideIcons: ["preview", "side-by-side"],
    renderingConfig: {
        codeSyntaxHighlighting: true,
    },
    tabSize: 4, // Set tab size to 4 spaces
});

const marked = new Marked(
    markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang, info) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, {language}).value;
        }
    })
);
marked.setOptions({
    highlight: function (code, lang) {
        return hljs.highlight(lang, code).value;
    }
});


const IssueFetchStrategy = {
    URL: 'url',
    PAGE_TITLE: 'pageTitle',
    ISSUE_ID: 'issueId'
};

// Default Configuration
const gitlabClientId = 'b13dc0c7b49e390d25c1278061c48ca938c5f48b72a6ec8f6e5d87c9d0cafc19';
const defaultRedirectUri = 'http://localhost:8080'; // Default redirect URI
const projectName = 'antonbelev.gitlab.io'; // Configurable project name
const issueMappingStrategy = IssueFetchStrategy.URL
let projectId = null;
let currentIssueId = null;

// User Configurable Options
const GitLabIssuesConfig = {
    clientId: gitlabClientId,
    redirectUri: defaultRedirectUri,
    localStorageKey: 'gitlabAccessToken'
};

// Override default config with user config (if provided)
if (window.GitLabIssuesConfig) {
    Object.assign(GitLabIssuesConfig, window.GitLabIssuesConfig);
}

// Function to handle GitLab authentication
function authenticateWithGitLab() {
    const oauthUrl = `https://gitlab.com/oauth/authorize?client_id=${GitLabIssuesConfig.clientId}&redirect_uri=${GitLabIssuesConfig.redirectUri}&response_type=code`;
    window.location.href = oauthUrl;
}

// Function to show authentication button
function showAuthButton() {
    const authButton = document.getElementById('authButton');
    authButton.style.display = 'block';
}

// Function to hide authentication button
function hideAuthButton() {
    const authButton = document.getElementById('authButton');
    authButton.style.display = 'none';
}

// Function to handle GitLab redirect with code
async function handleGitLabRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // Request access token
        await requestAccessToken(code);
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error('Failed to get access token');
        }

        const data = await response.json();
        const accessToken = data.access_token;
        localStorage.setItem(GitLabIssuesConfig.localStorageKey, accessToken);
        hideAuthButton();
        await fetchProjectId(accessToken);
    } catch (error) {
        console.error('Error requesting access token:', error);
    }
}

// Function to fetch project ID based on project name
async function fetchProjectId(accessToken) {
    try {
        const projectsUrl = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(projectName)}`;
        const response = await fetch(projectsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Clear token from local storage if it's expired
                localStorage.removeItem(GitLabIssuesConfig.localStorageKey);
                showAuthButton();
            }
            throw new Error('Failed to fetch projects');
        }

        const projects = await response.json();
        const project = projects.find(p => p.name === projectName);

        if (!project) {
            throw new Error(`Project "${projectName}" not found`);
        }

        window.projectId = project.id;
        await fetchIssuesByCriteria(accessToken, IssueFetchStrategy.ISSUE_ID);
    } catch (error) {
        console.error('Error fetching project ID:', error);
    }
}

// Function to fetch GitLab issues using API token
async function fetchGitLabIssue(projectId, accessToken, fetchType, fetchParam) {
    try {
        let apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/issues`;

        if (fetchType === 'url') {
            // Fetch the issue which contains the current URL in the issue title
            apiUrl += `?search=${encodeURIComponent(fetchParam)}`;
        } else if (fetchType === 'pageTitle') {
            // Fetch the issue which contains the current URL title in the issue title itself
            apiUrl += `?search=${encodeURIComponent(fetchParam.split('/').pop())}`;
        } else if (fetchType === 'issueId') {
            // Fetch an issue by ID
            apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/issues/${fetchParam}`;
        }

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Clear token from local storage if it's expired
                localStorage.removeItem(GitLabIssuesConfig.localStorageKey);
            }
            throw new Error('Failed to fetch issues' + ' status was ' + response.status);
        }

        const issueJson = await response.json();
        window.currentIssueId = issueJson.iid;
        console.log('fetchGitLabIssue data' + JSON.stringify(issueJson));
        await displayIssue(issueJson, accessToken);
    } catch (error) {
        console.error('Error fetching issues:', error);
    }
}

async function fetchIssuesByCriteria(accessToken, fetchStrategy) {
    try {
        console.log("Show loading...")
        showLoadingOverlay(); // Show loading overlay
        const currentUrl = window.location.href;
        const currentUrlTitle = document.title;

        // Example issue ID
        const issueId = '1';

        // Fetch issues based on the specified strategy
        if (fetchStrategy === IssueFetchStrategy.URL) {
            await fetchGitLabIssue(window.projectId, accessToken, IssueFetchStrategy.URL, currentUrl);
        } else if (fetchStrategy === IssueFetchStrategy.PAGE_TITLE) {
            await fetchGitLabIssue(window.projectId, accessToken, IssueFetchStrategy.PAGE_TITLE, currentUrlTitle);
        } else if (fetchStrategy === IssueFetchStrategy.ISSUE_ID) {
            await fetchGitLabIssue(window.projectId, accessToken, IssueFetchStrategy.ISSUE_ID, issueId);
        } else {
            console.error('Invalid fetch strategy');
        }
    } catch (error) {
        console.error('Error fetching issues:', error);
    } finally {
        console.log("Finally block executed - hideLoadingOverlay()");
        hideLoadingOverlay();
    }
}

// Function to fetch discussions for an issue
async function fetchIssueDiscussions(issueIid, accessToken) {
    try {
        const response = await fetch(`https://gitlab.com/api/v4/projects/55603648/issues/${issueIid}/discussions`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Clear token from local storage if it's expired
                localStorage.removeItem(GitLabIssuesConfig.localStorageKey);
            }
            throw new Error('Failed to fetch discussions for issue');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching discussions for issue:', error);
        return [];
    }
}

// Function to display issues in the HTML
async function displayIssue(issue, accessToken) {
    const issuesContainer = document.getElementById('issuesContainer');
    issuesContainer.innerHTML = ''; // Clear previous content

    if (!issue) {
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Failed to fetch GitLab issue.';
        issuesContainer.appendChild(errorMessage);
        return;
    }

    // Create a label for number of comments
    const totalComments = issue.user_notes_count
    const commentsLabel = document.createElement('div');
    commentsLabel.classList.add('comments-label');
    commentsLabel.textContent = `${totalComments} Comments - powered by BeBlob`;
    issuesContainer.appendChild(commentsLabel);

    const issueElement = document.createElement('div');
    issueElement.classList.add('issue');

    // Issue Description
    const descriptionElement = document.createElement('div');
    descriptionElement.classList.add('issue-description');
    descriptionElement.textContent = issue.title;
    issueElement.appendChild(descriptionElement);

    // Fetch and display discussions
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
    // If no discussions found
    if (discussions.length === 0) {
        const noCommentsElement = document.createElement('div');
        noCommentsElement.textContent = 'No comments';
        issueElement.appendChild(noCommentsElement);
    }

    issuesContainer.appendChild(issueElement);

}

// Function to create a comment element
function createCommentElement(comment, isIndented) {
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');

    if (isIndented) {
        // If it's a threaded comment (not the top-level), indent
        commentElement.style.marginLeft = '30px';
    }

    // Comment Header (Author and Timestamp)
    const headerElement = document.createElement('div');
    headerElement.classList.add('comment-header');

    // Author Avatar
    const authorAvatar = document.createElement('img');
    authorAvatar.src = comment.author.avatar_url;
    authorAvatar.alt = comment.author.name;
    headerElement.appendChild(authorAvatar);

    // Author Info (Name and Timestamp)
    const authorInfo = document.createElement('div');
    authorInfo.classList.add('author-info');

    // Author Name with Link to Profile
    const authorLink = document.createElement('a');
    authorLink.href = comment.author.web_url;
    authorLink.textContent = comment.author.name;
    authorLink.classList.add('author-name');
    authorInfo.appendChild(authorLink);

    // Commented on Text
    const commentedOn = document.createElement('span');
    commentedOn.classList.add('commented-on');
    commentedOn.textContent = ' commented on ';
    authorInfo.appendChild(commentedOn);

    // Comment Timestamp
    const timestamp = document.createElement('span');
    timestamp.classList.add('comment-timestamp');
    const commentDate = new Date(comment.created_at);
    const formattedDate = `${commentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })}`;
    timestamp.textContent = formattedDate;
    authorInfo.appendChild(timestamp);

    headerElement.appendChild(authorInfo);
    commentElement.appendChild(headerElement);

    // Comment Body (Markdown)
    const bodyElement = document.createElement('div');
    bodyElement.classList.add('comment-body');
    bodyElement.innerHTML = marked.parse(comment.body);
    commentElement.appendChild(bodyElement);

    return commentElement;
}

// Function to fetch current user details from GitLab
async function fetchCurrentUser(accessToken) {
    try {
        const currentUserUrl = 'https://gitlab.com/api/v4/user';
        const response = await fetch(currentUserUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Clear token from local storage if it's expired
                localStorage.removeItem(GitLabIssuesConfig.localStorageKey);
            }
            throw new Error('Failed to fetch current user');
        }

        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
    }
}

// Function to display current user avatar with bubble
function displayCurrentUserAvatar(user) {
    const currentUserAvatarContainer = document.createElement('div');
    currentUserAvatarContainer.classList.add('current-user-avatar-container');

    // Avatar Image
    const avatarImg = document.createElement('img');
    avatarImg.src = user.avatar_url;
    avatarImg.alt = user.name;
    currentUserAvatarContainer.appendChild(avatarImg);

    // Bubble Element
    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('bubble');
    currentUserAvatarContainer.appendChild(bubbleElement);

    const textareaContainer = document.querySelector('.comment-textarea-container');
    textareaContainer.insertBefore(currentUserAvatarContainer, textareaContainer.firstChild);
}

// Check if there's a code in the URL (GitLab redirect)
await handleGitLabRedirect();

// Function to show loading overlay
function showLoadingOverlay() {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'flex';
}

// Function to hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'none';
}

// Function to switch between tabs
function openTab(tabName) {
    // Get all elements with class="tabcontent" and hide them
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    // Show the current tab, and add an "active" class to the button that corresponds to the tab
    document.getElementById(tabName).style.display = "block";
    document.querySelector(`button[data-tab="${tabName}"]`).classList.add("active");

    // If switching to Preview tab, update the preview
    if (tabName === 'Preview') {
        updatePreview();
    }
}

// Function to update the preview with Markdown content
function updatePreview() {
    const markdownContent = simplemde.value();
    const previewContent = document.getElementById("previewContent");
    previewContent.innerHTML = marked.parse(markdownContent);
}

async function addCommentToIssue(accessToken, commentBody) {
    try {
        const apiUrl = `https://gitlab.com/api/v4/projects/${window.projectId}/issues/${window.currentIssueId}/notes`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: commentBody })
        });

        if (!response.ok) {
            throw new Error('Failed to add comment to issue');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding comment to issue:', error);
    }
}

document.getElementById("addCommentButton").addEventListener("click", async () => {
    const newComment = simplemde.value();
    const storedToken = localStorage.getItem(GitLabIssuesConfig.localStorageKey);

    if (!storedToken) {
        console.error('Access token not found');
        return;
    }

    if (!window.projectId || !window.currentIssueId) {
        console.error('Project ID or Issue ID not found');
        return;
    }

    await addCommentToIssue(storedToken, newComment);
    // clear textarea
    simplemde.value("");
    await fetchIssuesByCriteria(storedToken, IssueFetchStrategy.ISSUE_ID);
});

// Event listener for tab clicks
document.querySelectorAll('.tablinks').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        openTab(tabName);
    });
});

const authButton = document.getElementById('authButton');
authButton.style.display = 'block';
authButton.addEventListener('click', authenticateWithGitLab);

// Check if we have a GitLab access token in localStorage
const storedToken = localStorage.getItem(GitLabIssuesConfig.localStorageKey);

if (storedToken) {
    // If token exists, fetch project details
    await fetchProjectId(storedToken);

    // Fetch current user details
    fetchCurrentUser(storedToken)
        .then(user => {
            if (user) {
                displayCurrentUserAvatar(user);
            }
        })
        .catch(error => {
            console.error('Error fetching current user:', error);
        });
}
