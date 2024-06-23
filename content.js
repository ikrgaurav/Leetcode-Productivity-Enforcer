const restricted_sites = new Set();

// Retrieve the blockedWebsitesArray from Chrome storage
chrome.storage.sync.get("blockedWebsitesArray", function (data) {
  const blockedWebsitesArray = data.blockedWebsitesArray || [];
  if (blockedWebsitesArray && blockedWebsitesArray.length > 0) {
    blockedWebsitesArray.forEach((item) => {
      restricted_sites.add(item.toLowerCase());
      restricted_sites.add(normalizeURL(item.toLowerCase()));
    });
    check_if_restricted();
  }
});

function normalizeURL(url) {
  return url.replace(/^www\./i, "");
}

function shouldBlockWebsite() {
  const currentHostname = normalizeURL(window.location.hostname);
  return restricted_sites.has(currentHostname);
}

function createBlockedPage() {
  const blockedPage = generateHTML();
  const style = generateSTYLING();
  const head = document.head || document.getElementsByTagName("head")[0];
  head.insertAdjacentHTML("beforeend", style);
  document.body.innerHTML = blockedPage;
}

function check_if_restricted() {
  if (shouldBlockWebsite()) {
    createBlockedPage();
  }
}

function generateSTYLING() {
  return `
    <style>
    body {
      display: flex !important;
      justify-content: center !important;
      height: 100vh !important;
      margin: 0 !important;
      background-color: #174b42 !important;
      font-family: 'Noto Serif', serif !important;
    }
    h1 {
      font-size: 3em !important;
      margin-top: 20vh !important;
      color: white !important;
    }
    </style>
  `;
}

function generateHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Site Blocked</title>
    </head>
    <body>
      <h1>Site Blocked</h1>
    </body>
    </html>
  `;
}
