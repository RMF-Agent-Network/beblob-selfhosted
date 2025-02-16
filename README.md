# BeBlob

## Description
BeBlob is an open-source library that enables you to add a comment section to your web pages hosted on GitLab. The primary use case is to integrate a comment section into your Hexo or Cactus blogs hosted on GitLab Pages.

BeBlob maps your page URL to a GitLab issue within a configurable repository, enabling authenticated GitLab users to add comments and view others' comments.

## How It Works
BeBlob uses the GitLab OAuth flow to authenticate users. When a visitor wants to comment, they are redirected to GitLab where they can authorize the application using the "Authorization Code with PKCE" flow. Once authenticated, a token is stored locally to interact with GitLab’s API, allowing the application to create or retrieve issues corresponding to the current page and manage discussions seamlessly.

After authentication, BeBlob leverages GitLab issues to manage comments. Each page is mapped to an issue where all comments (or discussions) are stored and retrieved. This allows you to benefit from GitLab’s built-in features for comments, reactions, and moderation. For more details, check out the [GitLab OAuth documentation](https://docs.gitlab.com/ee/api/oauth2.html).

## Configuration
To use BeBlob, you must first create an OAuth application in GitLab:
1. Go to your GitLab account settings and navigate to **Applications**.
2. Create a new application with the following settings:
   - **Name:** (Your choice)
   - **Redirect URI:** Set this to the URL of your blog (e.g., `https://your-blog.com/`)
   - **Scopes:** `api` (Access the API on your behalf) and `read_user` (Read your personal information)
   - **Confidential:** Make sure the application is not set as confidential.
3. Note the **Application ID** (e.g., for my setup it is `b1c714b657fd46e01e5bfcbd26a12d561b27494c252141e52e886baeb0b0df5a`). You will need this along with the other configuration options in your widget.


## Configuration Options

BeBlob supports several configuration options that you set as data attributes on the `<script>` tag (or within your Hexo/Cactus configuration). Here is a summary of each available option:

- **clientId**  
  The GitLab Application ID that you obtain when you create your OAuth application in GitLab. This value is public and used to identify your application during authentication.

- **redirectUri**  
  The callback URL configured in your GitLab OAuth application. This should point to your website (for example, `https://your-blog.com/`) and must match the URL you set when creating the GitLab application.

- **projectName**  
  The name of the GitLab project (repository) where BeBlob will create or search for issues. Each page on your site maps to an issue within this project.

- **issueMappingStrategy**  
  Determines how BeBlob maps your pages to GitLab issues. Possible values include:
  - `URL`: Search by the full page URL.
  - `PAGE_TITLE`: Search by the page title.
  - `ISSUE_ID`: Use a specific issue ID (in this case, you must also provide the `issueId` option).

- **issueId (Optional)**  
  When using the `ISSUE_ID` mapping strategy, specify the exact issue ID to use for storing and retrieving comments.

- **devMode**  
  A Boolean flag (or string value `"true"`/`"false"`) indicating whether you are running in development mode. In development mode, BeBlob loads its assets locally; in production, assets are loaded from a CDN (e.g., unpkg).

- **beblobVersion**  
  The version of BeBlob to load when retrieving the script from a CDN. This allows you to lock your site to a specific release (e.g., `1.3.0`) or update it as needed. See [atest release here](https://www.npmjs.com/package/beblob).

## Integration

To integrate BeBlob into your website, include the following minimal HTML code in your page:

```html
<!-- Include the BeBlob script with necessary configuration data attributes -->
<script
  id="beblob-script"
  src="https://unpkg.com/beblob@1.3.0/dist/beblob.js"
  data-client-id="YOUR_GITLAB_APPLICATION_ID"
  data-redirect-uri="https://your-blog.com/"
  data-project-name="Your GitLab Project Name"
  data-issue-mapping-strategy="PAGE_TITLE"
  data-dev-mode="false"
  data-beblob-version="1.3.0"
></script>

<!-- Container where the widget will be injected -->
<div id="beblob_thread"></div>
```

Replace the data attributes with your actual configuration values.

## Hexo / Cactus Integration

For Hexo or Cactus users, you can integrate BeBlob by modifying your `_config.yml` and the comments template (e.g., `comments.ejs`).

Example `_config.yml` snippet:

```yml
beblob:
    clientId: YOUR_GITLAB_APPLICATION_ID
    redirectUri: https://your-blog.com/
    projectName: Your GitLab Project Name
    issueMappingStrategy: PAGE_TITLE
    beblobVersion: 1.2.0
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
              defer>
      </script>
    <% } %>
  </div>
<% } %>
```

For a working example, see my repository: [antonbelev.gitlab.io](https://gitlab.com/antonbelev/antonbelev.gitlab.io)

## Sites Using BeBlob
- https://belev.me/

## Inspiration
BeBlob has been inspired by similar tools for GitHub, such as [giscus](https://giscus.app/) and [utterances](https://github.com/utterance/utterances). These projects have paved the way for integrating discussion systems into static sites, and I wanted to provide a similar experience for GitLab.

## Support
If you found a bug or have an idea for a new feature, feel free to raise an issue [here](https://gitlab.com/antonbelev/beblob/-/issues) and add as much detail as possible.

## Roadmap
- [ ] Ability to manage comments
- [ ] Add multiple themes
- [ ] Investigate direct support in hexo as a plugin

## Developer docs

### Publishing new version to npm from local

1. Update package version:
```bash
npm version patch   # For a small bug fix
npm version minor   # For a new feature that is backward-compatible
npm version major   # For breaking changes
```

2. Test the Package Locally
Before publishing, it’s a good practice to test your package locally:
```bash
npm pack
```

3. Publish to npm
```bash
npm publish
```

## License
This project is licensed under the MIT License. See the LICENSE file for details.