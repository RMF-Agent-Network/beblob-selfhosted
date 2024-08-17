# BeBlob

## Description
BeBlob is an open-source library that enables you to add a comment section to your web pages hosted on GitLab. The primary use case is to integrate a comment section into your Hexo or Cactus blogs hosted on GitLab Pages.

BeBlob maps your page URL to a GitLab issue within a configurable repository, enabling authenticated GitLab users to add comments and view others' comments.
## Installation
TODO - local development guide

## Usage
TODO - add examples for usage

## Support
If you found a bug or have an idea for new feature - feel free to raise that as an issue [here](https://gitlab.com/antonbelev/beblob/-/issues) and add as much detail as possible.

## Roadmap
- [X] GitLab API Authentication using [Authorization code with Proof Key for Code Exchange](https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-with-proof-key-for-code-exchange-pkce)
 Create an Issue related to a blog post
- [X] Ability to add comments to a blog post
- [ ] Host js file on https://unpkg.com/ or similar
- [ ] Add styling
- [ ] Support multiple color schemes from [Cactus](https://probberechts.github.io/hexo-theme-cactus/)
- [ ] Add linting
- [ ] Write Contributing guide
- [ ] Update Docs
- [ ] Investigate Hexo Cactus integration - currently Cactus only supports Disqus and Utterances [see here](https://github.com/probberechts/hexo-theme-cactus?tab=readme-ov-file#comments)
- [ ] Add examples of usage
- [ ] Add demo from my website

## Contributing
Contributors will be welcome after the initial v1.0 has been completed.

## Authors and acknowledgment
Anton Belev @ [https://belev.me](https://belev.me)

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
MIT

## Project status
Under development
