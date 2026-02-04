# Self-Hosted GitLab Setup Guide

This guide walks you through setting up BeBlob with a **self-hosted GitLab instance** (instead of gitlab.com). By the end, you'll have a fully working comment system on your Hugo site that authenticates against your own GitLab.

---

## 1. Prerequisites

- **Self-hosted GitLab instance** — version **15.1+** is recommended for built-in CORS support. Older versions may require manual CORS configuration at the reverse proxy level.
- **Network access** — users' browsers must be able to reach both your Hugo site **and** your GitLab instance. If both are behind a VPN, users must be connected to the VPN.
- **GitLab must be at the domain root** — e.g., `https://gitlab.yourcompany.com`. Sub-path installations (e.g., `https://company.com/gitlab/`) are **not supported** in this version.

## 2. Create a GitLab Project for Comments

BeBlob stores comments as GitLab issues. You need a project to hold them.

1. Log in to your GitLab instance.
2. Create a new project (e.g., `site-comments`).
   - It can be completely empty — no code, no README needed.
   - Set visibility to **Internal** or **Public** depending on who should be able to read comments.
   - Users who want to *post* comments will need at least **Reporter** access to the project (or the project must be public with issues enabled for everyone).
3. Note the **project name** exactly as it appears in GitLab — you'll need it for the configuration.

## 3. Create an OAuth Application

BeBlob uses GitLab OAuth to authenticate users. You need to register an OAuth application.

1. Navigate to your GitLab instance:
   - **For a personal app:** Go to **User Settings → Applications**
   - **For an instance-wide app:** Go to **Admin Area → Applications**
2. Click **New Application** and fill in:
   - **Name:** `BeBlob` (or whatever you prefer)
   - **Redirect URI:** The full URL of your Hugo site (e.g., `https://your-hugo-site.yourcompany.com/`)
     - ⚠️ This must **exactly match** the `redirect_uri` in your BeBlob configuration (including trailing slash)
   - **Scopes:** Check both:
     - `api` — Access the API on the user's behalf
     - `read_user` — Read the user's personal information
   - **Confidential:** **Unchecked** — BeBlob is a public client (runs in the browser, no server-side secret)
3. Click **Save application**.
4. Note the **Application ID** — you'll need this for configuration. (The Application ID is not a secret.)

## 4. Add BeBlob to Your Hugo Site

### Copy the assets

1. Copy `dist/beblob.js` to your Hugo site's `static/js/` directory:
   ```bash
   cp dist/beblob.js /path/to/your-hugo-site/static/js/beblob.js
   ```

2. Optionally, copy the stylesheet:
   ```bash
   cp dist/css/styles.css /path/to/your-hugo-site/static/css/beblob-styles.css
   ```
   (BeBlob will also load styles automatically from the CDN in production mode, but for self-hosted setups you should host the CSS locally too.)

### Add the Hugo partial

Copy the partial template to your Hugo site:

```bash
cp docs/hugo-integration/layouts/partials/beblob-comments.html \
   /path/to/your-hugo-site/layouts/partials/beblob-comments.html
```

Or create the file manually — see [`docs/hugo-integration/layouts/partials/beblob-comments.html`](hugo-integration/layouts/partials/beblob-comments.html) for the full template.

### Add the configuration

Add the following to your `hugo.toml` (or `config.toml`):

```toml
[params.beblob]
  enabled = true
  gitlab_url = "https://gitlab.yourcompany.com"
  client_id = "YOUR_APPLICATION_ID"
  redirect_uri = "https://your-hugo-site.yourcompany.com/"
  project_name = "site-comments"
  issue_mapping_strategy = "pageTitle"
  version = "2.0.0"
  src = "/js/beblob.js"
  theme = "dark"
  dev_mode = false
```

See [`docs/hugo-integration/hugo-config-example.toml`](hugo-integration/hugo-config-example.toml) for a fully commented example.

**Key settings:**
- `gitlab_url` — Your self-hosted GitLab URL. Omit this line (or leave empty) to use `gitlab.com`.
- `client_id` — The Application ID from step 3.
- `redirect_uri` — Must **exactly match** what you entered in the GitLab OAuth application.
- `project_name` — Must **exactly match** the GitLab project name from step 2.
- `src` — Path to the locally hosted `beblob.js`. For self-hosted/VPN setups, don't use the unpkg CDN.

## 5. Include the Partial in Your Templates

Add the comment partial to your Hugo layout template. For blog posts, edit your `layouts/_default/single.html` (or your theme's equivalent):

```html
{{ define "main" }}
  <article>
    <h1>{{ .Title }}</h1>
    {{ .Content }}
  </article>

  <!-- BeBlob Comments -->
  {{ partial "beblob-comments.html" . }}
{{ end }}
```

## 6. Test It

1. Build your Hugo site:
   ```bash
   hugo server
   ```
2. Navigate to any blog post page.
3. You should see the BeBlob comment widget with an "Authenticate with GitLab" button.
4. Click the button — you should be redirected to your GitLab instance's OAuth authorization page.
5. Authorize the application.
6. After redirect back to your site, you should be logged in and able to post a comment.
7. Check your GitLab project — a new issue should have been created corresponding to the page.

## 7. Troubleshooting

### CORS Errors

**Symptom:** Browser console shows errors like `Access to fetch has been blocked by CORS policy`.

**Cause:** Your GitLab instance isn't sending CORS headers for API requests from your Hugo site's domain.

**Solutions:**
- **GitLab 15.1+:** CORS should work out of the box for OAuth and API endpoints. Verify your GitLab version at `https://gitlab.yourcompany.com/help`.
- **Older GitLab versions:** Configure CORS headers in your reverse proxy. Example for **nginx**:
  ```nginx
  location /api/ {
      add_header 'Access-Control-Allow-Origin' 'https://your-hugo-site.yourcompany.com' always;
      add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
      add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
      if ($request_method = 'OPTIONS') {
          return 204;
      }
      proxy_pass http://gitlab-backend;
  }
  ```

### OAuth Redirect Issues

**Symptom:** After authorizing in GitLab, you're not redirected back to your site, or you see an error.

**Fix:** Ensure the `redirect_uri` in your Hugo config **exactly matches** the Redirect URI in your GitLab OAuth application settings — including the protocol (`https://`), trailing slash, and any port number.

### "Project not found"

**Symptom:** Widget loads but shows no comments and console shows a project search error.

**Fix:** Ensure `project_name` in your config **exactly matches** the project name in GitLab (case-sensitive). The authenticated user must also have at least **Guest** access to the project.

### Comments Not Loading

**Symptom:** Widget appears, user is authenticated, but no comments show.

**Steps:**
1. Open browser developer tools → Console tab. Look for API errors.
2. Check the Network tab — are API calls to your GitLab instance succeeding?
3. Verify the user has access to the GitLab project.
4. Check that issues exist in the GitLab project corresponding to your pages.

### HTTP in Development

**Symptom:** Error about `http://` URLs not being allowed.

**Fix:** BeBlob requires `https://` for the GitLab URL by default. For local development with `http://`, set `data-dev-mode="true"` (or `dev_mode = true` in Hugo config). **Never use `http://` in production.**

---

## Further Reading

- [BeBlob README](../README.md) — Full configuration options and integration details
- [GitLab OAuth Documentation](https://docs.gitlab.com/ee/api/oauth2.html)
- [GitLab API v4 Documentation](https://docs.gitlab.com/ee/api/)
