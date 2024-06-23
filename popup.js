document.addEventListener("DOMContentLoaded", async () => {
    const goalInput = document.getElementById("daily-goal-input");
    const setGoalButton = document.getElementById("set-goal-button");
    const whitelistInput = document.getElementById("whitelist-input");
    const addWhitelistButton = document.getElementById("add-whitelist-button");
    const whitelistList = document.getElementById("whitelist-list");

    // Load current settings
    const data = await chrome.storage.local.get(["goal", "whitelist"]);
    goalInput.value = data.goal || 0;
    const whitelist = data.whitelist || [];

    whitelist.forEach(url => {
        addWhitelistItem(url);
    });

    setGoalButton.addEventListener("click", () => {
        const goal = parseInt(goalInput.value, 10);
        if (goal > 0) {
            chrome.storage.local.set({ goal });
            chrome.runtime.sendMessage({ action: "updateGoal", data: goal });
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
});
