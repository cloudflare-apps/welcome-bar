# Welcome Bar

## Setup

Install the dependencies with `npm install`

## Usage

- `npm start` Watches for file changes and compile them.
- `npm run build` Compiles your JavaScript and CSS once for release.
- `npm run lint` Checks JavaScript formatting and attempts to fix any errors.

## Details

#### `source/app.js`

This is where the magic happens. Your app starts here.

#### `source/app.css`

Styles for your app.

#### `install.json`

This is where all the <a href="https://www.cloudflare.com/apps/developer/docs/install-json">installer options</a> are added for the app.

<a href="http://install.json.is/">Syntax can be tricky</a>, so be sure to double check it.

#### `media/**`

An directory for icons, tile images, and screenshots.

[Download <code class="inline">media-templates.sketch</code>](https://github.com/CloudflareApps/MediaTemplates/raw/master/media-templates.sketch)

### Troubleshooting

- <a href="https://www.cloudflare.com/apps/developer/docs/getting-started">The Cloudflare developer documentation</a> for examples and API usage.

<a href="https://www.cloudflare.com/apps/[[YOUR APP ALIAS]]/install?source=button">
  <img
    src="https://install.cloudflareapps.com/install-button.png"
    alt="Install [[YOUR APP NAME]] with Cloudflare"
    border="0"
    width="150">
</a>
