let LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";
let LEETCODE_GRAPHQL_QUERY = `
query globalData {
  streakCounter {
    currentDayCompleted
  }
  userStatus {
    isSignedIn
    username
  }
  activeDailyCodingChallengeQuestion {
    link
  }
}
`;
let LEETCODE_ALL_PROBLEMS_QUERY = `
query userSessionProgress($username: String!) {
  matchedUser(username: $username) {
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
}
`;

let domainWhiteList = new Set(["leetcode.com", "accounts.google.com", "extensions", "github.com", "drive.google.com"]);

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    numSubmissions: 0,
    goal: 0,
    whitelist: ["leetcode.com"],
    goalAchieved: false,
    todayDateAfterChallenegeComplete: new Date().toDateString()
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.whitelist) {
    domainWhiteList = new Set(changes.whitelist.newValue.map(normalizeURL));
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    const goalData = await chrome.storage.local.get(["goal", "numSubmissions", "goalAchieved"]);
    const currentHostname = normalizeURL(new URL(tab.url).hostname);

    if (!goalData.goalAchieved && goalData.numSubmissions < goalData.goal && !domainWhiteList.has(currentHostname)) {
      redirect(tabId, "/");
    }
  }
});

chrome.tabs.onActivated.addListener(async () => {
  const goalData = await chrome.storage.local.get(["goal", "numSubmissions", "goalAchieved"]);
  const activeTab = await getActiveTab();
  const currentHostname = normalizeURL(new URL(activeTab.url).hostname);

  if (!goalData.goalAchieved && goalData.numSubmissions < goalData.goal && !domainWhiteList.has(currentHostname)) {
    redirect(activeTab.id, "/");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateWhitelist") {
    updateWhitelist(message.data);
  } else if (message.action === "updateGoal") {
    updateGoal(message.data);
  }
});

function normalizeURL(url) {
  return url.replace(/^www\./i, "");
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function redirect(tabId, path = "/") {
  chrome.tabs.update(tabId, { url: `http://leetcode.com${path}` });
}

async function updateGoal(goal) {
  await chrome.storage.local.set({ goal });
  await checkGoalStatus();
}

async function updateWhitelist(whitelist) {
  await chrome.storage.local.set({ whitelist });
  domainWhiteList = new Set(whitelist.map(normalizeURL));
}

async function checkGoalStatus() {
  const goalData = await chrome.storage.local.get(["goal", "numSubmissions"]);
  const goalAchieved = goalData.numSubmissions >= goalData.goal;
  await chrome.storage.local.set({ goalAchieved });
}

async function leetcodeForcer() {
  const data = await getLeetCodeData(LEETCODE_GRAPHQL_QUERY);
  if (!data || !data.data) {
    throw new Error("No data received.");
  }

  const userData = data.data;
  if (userData.userStatus.isSignedIn) {
    const problemsData = await getLeetCodeData(LEETCODE_ALL_PROBLEMS_QUERY, { username: userData.userStatus.username });
    const numSubmissions = problemsData.data.matchedUser.submitStats.acSubmissionNum[0].submissions;
    await chrome.storage.local.set({ numSubmissions });
    await checkGoalStatus();
  }
}

async function isAlreadySolved() {
  const items = await chrome.storage.local.get(["todayDateAfterChallenegeComplete", "utcDateStoredForDaily", "mode"]);
  const lastSolvedDay = items.todayDateAfterChallenegeComplete;
  const todayDate = new Date();
  
  if (items.mode !== undefined && items.mode === "daily") {
    const lastSolvedDateForDailyInUtc = items.utcDateStoredForDaily;
    const todayDateInUtc = new Date().getUTCDate();
    return (lastSolvedDateForDailyInUtc !== undefined && lastSolvedDateForDailyInUtc === todayDateInUtc);
  }

  return (lastSolvedDay !== undefined && new Date(lastSolvedDay).getDate() === todayDate.getDate());
}

async function emergencyButtonHandle() {
  if (await isAlreadySolved()) {
    return;
  }

  const items = await chrome.storage.local.get("storedTime");
  if (items.storedTime) {
    const lastStoredDate = new Date(items.storedTime);
    const currentTime = new Date();
    const diffTime = currentTime - lastStoredDate;

    if (diffTime >= 3 * 60 * 60 * 1000) {
      chrome.storage.local.remove("storedTime");
      await leetcodeForcer();
    }
  } else {
    await leetcodeForcer();
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    await emergencyButtonHandle();
  }
});

chrome.tabs.onActivated.addListener(async () => {
  await emergencyButtonHandle();
});

async function getLeetCodeData(query, variables = {}) {
  let retriesLeft = 3;
  while (retriesLeft > 0) {
    try {
      const init = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      };

      const response = await fetch(LEETCODE_API_ENDPOINT, init);

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.error(`Error: ${error}. Retrying...`);
      retriesLeft--;
    }
  }

  console.error("Failed to call API after 3 retries.");
}
