document.addEventListener("DOMContentLoaded", async () => {
    const goalInput = document.getElementById("goal");
    const setGoalButton = document.getElementById("set-goal");
    const whitelistInput = document.getElementById("whitelist-input");
    const addWhitelistButton = document.getElementById("add-whitelist");
    const whitelistList = document.getElementById("whitelist-list");
    const progressDisplay = document.getElementById("progress");

    let goal = 0;
    let problemsSolved = 0;
    let currentProblems = 0;

    // Load current settings
    const data = await chrome.storage.local.get(["goal", "whitelist", "problemsSolved", "currentProblems"]);
    goal = data.goal || 0;
    problemsSolved = data.problemsSolved || 0;
    currentProblems = data.currentProblems || 0;
    goalInput.value = goal;
    updateProgressDisplay();

    const whitelist = data.whitelist || [];
    whitelist.forEach(url => {
        addWhitelistItem(url);
    });

    setGoalButton.addEventListener("click", async () => {
        goal = parseInt(goalInput.value, 10);
        if (goal > 0) {
            currentProblems = await getCurrentProblems();
            chrome.storage.local.set({ goal, currentProblems });
            chrome.runtime.sendMessage({ action: "updateGoal", data: goal });
            updateProgressDisplay();
        }
    });

    addWhitelistButton.addEventListener("click", () => {
        const url = whitelistInput.value.trim();
        if (url) {
            addWhitelistItem(url);
            whitelist.push(url);
            chrome.storage.local.set({ whitelist });
            chrome.runtime.sendMessage({ action: "updateWhitelist", data: whitelist });
            whitelistInput.value = "";
        }
    });

    function addWhitelistItem(url) {
        const li = document.createElement("li");
        li.textContent = url;
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", () => {
            const index = whitelist.indexOf(url);
            if (index > -1) {
                whitelist.splice(index, 1);
                chrome.storage.local.set({ whitelist });
                chrome.runtime.sendMessage({ action: "updateWhitelist", data: whitelist });
                whitelistList.removeChild(li);
            }
        });
        li.appendChild(removeButton);
        whitelistList.appendChild(li);
    }

    function updateProgressDisplay() {
        progressDisplay.textContent = `Solved ${problemsSolved} out of ${goal} problems. ${goal - problemsSolved} left to go.`;
    }

    // Listen for updates from background script
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "updateProblemsSolved") {
            problemsSolved = request.data;
            chrome.storage.local.set({ problemsSolved });
            updateProgressDisplay();
        } else if (request.action === "goalReached") {
            alert("Congratulations! You have reached your goal!");
        }
    });

    async function getCurrentProblems() {
        const response = await fetch('https://leetcode.com/api/problems/algorithms/');
        const data = await response.json();
        return data.num_solved;
    }
});
