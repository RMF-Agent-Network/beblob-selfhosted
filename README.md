# BeBlob — Self-Hosted GitLab Support

> **This is a fork of [BeBlob](https://gitlab.com/antonbelev/beblob) by Anton Belev, with added support for self-hosted GitLab instances.**
>
> The original BeBlob only works with `gitlab.com`. This fork makes the GitLab instance URL configurable via the `data-gitlab-url` attribute, enabling use with any self-hosted GitLab deployment.

## Description

BeBlob is an open-source library that enhances any static or dynamic website by seamlessly adding a comment section to your webpages—without requiring any backend or database integration. By leveraging GitLab issues for storage and management, BeBlob allows website owners to implement a robust commenting system with minimal setup. Users authenticate via GitLab OAuth, and their comments are stored as GitLab issues, making it an ideal solution for blogs, portfolios, and other sites seeking an interactive commenting experience.

## How It Works

BeBlob uses the GitLab OAuth flow to authenticate users. When a visitor wants to comment, they are redirected to GitLab where they can authorize the application using the "Authorization Code with PKCE" flow. Once authenticated, a token is stored locally to interact with GitLab's API, allowing the application to create or retrieve issues corresponding to the current page and manage discussions seamlessly.

After authentication, BeBlob leverages GitLab issues to manage comments. Each page is mapped to an issue where all comments (or discussions) are stored and retrieved. This allows you to benefit from GitLab's built-in features for comments, reactions, and moderation. For more details, check out the [GitLab OAuth documentation](https://docs.gitlab.com/ee/api/oauth2.html).

## Demo

You can see BeBlob in action [here!](https://antonbelev.gitlab.io/beblob-demo/)

## Features

- **Self-Hosted GitLab Support:**
  Configurable GitLab instance URL — use with `gitlab.com` or any self-hosted GitLab deployment.

- **Emoji Reactions:**
  Users can react to posts using a predefined set of emojis (e.g., 👍, 👎, ❤️, 🎉, 😕) to quickly express their feedback.

- **Markdown Comments:**
  Supports writing comments in Markdown, allowing for rich text formatting.

- **Live Preview:**
  Users can preview their Markdown comments before posting, ensuring that the final comment appears as intended.

- **GitLab Authentication:**
  Provides a seamless GitLab OAuth integration so users can authenticate using their GitLab account. This enables personalized interactions and proper attribution of comments.

- **Logout Support:**
  Users can easily log out, clearing their authentication token and returning the widget to its initial state.

- **Seamless Integration:**
  Designed to work on any static or dynamic website without requiring a dedicated backend or database, leveraging GitLab issues for comment storage.

- **Customizable Themes:**
  BeBlob supports multiple themes (dark, white, light, and classic) inspired by the Hexo Cactus themes. These themes allow you to match the look and feel of your site, ensuring the comment widget integrates seamlessly with your overall design.

## Configuration

To use BeBlob, you must first create an OAuth application in GitLab:

1. Go to your GitLab instance settings and navigate to **Applications**.
   - For `gitlab.com`: User Settings → Applications
   - For self-hosted: User Settings → Applications (or Admin Area → Applications for instance-wide)
2. Create a new application with the following settings:
   - **Name:** (Your choice)
   - **Redirect URI:** Set this to the URL of your blog (e.g., `https://your-blog.com/`)
   - **Scopes:** `api` (Access the API on your behalf) and `read_user` (Read your personal information)
   - **Confidential:** Make sure the application is **not** set as confidential.
3. Note the **Application ID** (the Application ID is not a secret!). You will need this along with the other configuration options in your widget.

## Configuration Options

BeBlob supports several configuration options that you set as data attributes on the `<script>` tag (or within your Hugo/Hexo/Cactus configuration). Here is a summary of each available option:

- **gitlabUrl** *(new in v2.0.0)*
  The URL of your GitLab instance. Set this to your self-hosted GitLab URL (e.g., `https://gitlab.yourcompany.com`). If omitted, defaults to `https://gitlab.com`. The URL must use `https://` (or `http://` in devMode only), must not have a trailing slash or path component, and the GitLab instance must be at the domain root.

- **clientId**
  The GitLab Application ID that you obtain when you create your OAuth application in GitLab. This value is public and used to identify your application during authentication.

- **redirectUri**
  The callback URL configured in your GitLab OAuth application. This should point to your website (for example, `https://your-blog.com/`) and must match the URL you set when creating the GitLab application.

- **projectName**
  The name of the GitLab project (repository) where BeBlob will create or search for issues. Each page on your site maps to an issue within this project.

- **issueMappingStrategy**
  Determines how BeBlob maps your pages to GitLab issues. Possible values include:
  - `url`: Search by the full page URL.
  - `pageTitle`: Search by the page title.
  - `issueId`: Use a specific issue ID (in this case, you must also provide the `issueId` option).

- **issueId** *(Optional)*
  When using the `issueId` mapping strategy, specify the exact issue ID to use for storing and retrieving comments.

- **devMode**
  A Boolean flag (or string value `"true"`/`"false"`) indicating whether you are running in development mode. In development mode, BeBlob loads its assets locally and allows `http://` GitLab URLs; in production, `https://` is required.

- **beblobVersion**
  The version of BeBlob to load when retrieving the script from a CDN. This allows you to lock your site to a specific release (e.g., `2.0.0`) or update it as needed.

- **theme**
  Specifies the visual theme for the BeBlob widget. Four themes are available:
  - **dark**
  - **white**
  - **light** (default)
  - **classic**

  Set this value as a data attribute (for example, `data-theme="dark"`) to have the widget adopt the corresponding color scheme.

## Integration

To integrate BeBlob into your website, include the following minimal HTML code in your page.

```html
<!-- Include the BeBlob script with necessary configuration data attributes -->
<script
  id="beblob-script"
  src="https://unpkg.com/beblob@2.0.0/dist/beblob.js"
  data-gitlab-url="https://gitlab.yourcompany.com"
  data-client-id="YOUR_GITLAB_APPLICATION_ID"
  data-redirect-uri="https://your-blog.com/"
  data-project-name="Your GitLab Project Name"
  data-issue-mapping-strategy="pageTitle"
  data-dev-mode="false"
  data-beblob-version="2.0.0"
  data-theme="light"
></script>

<!-- Container where the widget will be injected -->
<div id="beblob_thread"></div>
```

Replace the data attributes with your actual configuration values. To use with `gitlab.com`, simply omit the `data-gitlab-url` attribute.

## Self-Hosted GitLab

For detailed instructions on setting up BeBlob with a self-hosted GitLab instance, see the **[Self-Hosted Setup Guide](docs/SELF-HOSTED-SETUP.md)**.

The guide covers:
- Prerequisites and GitLab version requirements
- Creating an OAuth application on your GitLab instance
- Configuring BeBlob for your self-hosted deployment
- Troubleshooting CORS, OAuth, and connectivity issues

## Hugo Integration

Ready-to-use Hugo partial and configuration example are provided in [`docs/hugo-integration/`](docs/hugo-integration/):

- **Partial template:** [`layouts/partials/beblob-comments.html`](docs/hugo-integration/layouts/partials/beblob-comments.html)
- **Config example:** [`hugo-config-example.toml`](docs/hugo-integration/hugo-config-example.toml)

Quick setup:

1. Copy `dist/beblob.js` to your Hugo site's `static/js/` directory.
2. Copy the partial to your site's `layouts/partials/` directory.
3. Add the config block to your `hugo.toml`.
4. Include `{{ partial "beblob-comments.html" . }}` in your layout templates.

See the [Self-Hosted Setup Guide](docs/SELF-HOSTED-SETUP.md) for full step-by-step instructions.

## Hexo / Cactus Integration

For Hexo or Cactus users, you can integrate BeBlob by modifying your `_config.yml` and the comments template (e.g., `comments.ejs`).

Example `_config.yml` snippet:

```yml
beblob:
  enabled: true
  client_id: "<your-gitlab-application-id>"
  redirect_uri: "https://yourwebsite.com"
  project_name: "<your-gitlab-project-name>"
  issue_mapping_strategy: "pageTitle"
  version: "2.0.0"
  theme: "light"
```

Example `comments.ejs` snippet:

```html
<% if (page.comments && config.beblob.enabled) { %>
  <div class="blog-post-comments">
    <!-- BeBlob placeholder container -->
    <div id="beblob_thread">
      <noscript>Please enable JavaScript to view comments.</noscript>
    </div>
    <!-- BeBlob script -->
    <% if (config.beblob.dev_mode) { %>
      <script id="beblob-script" src="/js/beblob.js"
              data-client-id="<%= config.beblob.client_id %>"
              data-redirect-uri="<%= config.beblob.redirect_uri %>"
              data-project-name="<%= config.beblob.project_name %>"
              data-issue-mapping-strategy="<%= config.beblob.issue_mapping_strategy %>"
              data-dev-mode="true"
              data-beblob-version="<%= config.beblob.version %>"
              data-theme="<%= config.beblob.theme %>"
              defer>
      </script>
    <% } else { %>
      <script id="beblob-script" src="https://unpkg.com/beblob@<%= config.beblob.version %>/dist/beblob.js"
              data-client-id="<%= config.beblob.client_id %>"
              data-redirect-uri="<%= config.beblob.redirect_uri %>"
              data-project-name="<%= config.beblob.project_name %>"
              data-issue-mapping-strategy="<%= config.beblob.issue_mapping_strategy %>"
              data-dev-mode="false"
              data-beblob-version="<%= config.beblob.version %>"
              data-theme="<%= config.beblob.theme %>"
              defer>
      </script>
    <% } %>
  </div>
<% } %>
```

For a working example, see the upstream repository: [antonbelev.gitlab.io](https://gitlab.com/antonbelev/antonbelev.gitlab.io)

## Changes from Upstream

This fork ([RMF-Agent-Network/beblob-selfhosted](https://github.com/RMF-Agent-Network/beblob-selfhosted)) adds the following changes to the [original BeBlob](https://gitlab.com/antonbelev/beblob) v1.6.0:

- **Configurable GitLab URL** — New `data-gitlab-url` attribute / `gitlabUrl` config option. All 13 hardcoded `https://gitlab.com` API/OAuth URLs in `main.js` replaced with configurable base URL (the attribution link remains unchanged).
- **URL helper module** (`src/js/urls.js`) — Centralized URL construction with `buildApiUrl()`, `buildOAuthAuthorizeUrl()`, `buildOAuthTokenUrl()`, and `normalizeGitlabUrl()`.
- **Config parser module** (`src/js/config.js`) — Extracted configuration parsing with validation for the new `gitlabUrl` parameter.
- **Test suite** — 44 unit and integration tests covering URL construction, config parsing, API call URLs, and OAuth flow (the original had zero tests).
- **Hugo integration docs** — Ready-to-use Hugo partial template and configuration example.
- **Self-hosted setup guide** — Step-by-step guide for deploying with a self-hosted GitLab instance.
- **Removed unused `axios` dependency** — The code uses native `fetch`; axios was a dead dependency.
- **GitHub CI** — Added GitHub Actions workflow (replacing `.gitlab-ci.yml`).

## Sites Using BeBlob

- https://belev.me/

## Inspiration

BeBlob has been inspired by similar tools for GitHub, such as [giscus](https://giscus.app/) and [utterances](https://github.com/utterance/utterances). These projects have paved the way for integrating discussion systems into static sites. The original author, Anton Belev, wanted to provide a similar experience for GitLab.

## Support

- **This fork:** [GitHub Issues](https://github.com/RMF-Agent-Network/beblob-selfhosted/issues)
- **Original project:** [GitLab Issues](https://gitlab.com/antonbelev/beblob/-/issues)

## Developer Docs

### Publishing new version to npm from local

1. Update package version:
```bash
npm version patch   # For a small bug fix
npm version minor   # For a new feature that is backward-compatible
npm version major   # For breaking changes
```

2. Test the Package Locally:
```bash
npm pack
```

3. Publish to npm:
```bash
npm publish
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Attribution

Original BeBlob by [Anton Belev](https://gitlab.com/antonbelev/beblob) — MIT License.
