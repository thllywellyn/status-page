const API_KEY = "YOUR_UPTIMEROBOT_API_KEY";
const PROXY_URL = "https://uptime-router.lsana.workers.dev";
const API_URL = "https://api.uptimerobot.com/v2/getMonitors";
const monitorList = document.getElementById("monitor-list");
const lastUpdated = document.getElementById("last-updated");
const countdown = document.getElementById("countdown");

let refreshTime = 60; // Update every 60 seconds

function fetchStatus() {
    fetch(`${PROXY_URL}?url=${encodeURIComponent(API_URL)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `api_key=${API_KEY}&format=json&logs=1`
    })
    .then(response => response.json())
    .then(data => {
        monitorList.innerHTML = "";
        let allOnline = true;

        data.monitors.forEach(monitor => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${monitor.friendly_name}</span>
                <span>${monitor.uptime || "0.00"}%</span>
                <span class="${monitor.status === 2 ? "online" : "offline"}">
                    ${monitor.status === 2 ? "🟢 Up" : "🔴 Down"}
                </span>
            `;
            if (monitor.status !== 2) allOnline = false;
            monitorList.appendChild(li);
        });

        document.getElementById("status-summary").textContent = allOnline ? "✅ All systems operational" : "⚠️ Some systems down";
        lastUpdated.textContent = new Date().toLocaleTimeString();
    })
    .catch(error => {
        console.error("Error fetching data:", error);
        document.getElementById("status-summary").textContent = "❌ Failed to fetch data";
    });
}

// Countdown Timer
function updateCountdown() {
    countdown.textContent = refreshTime;
    refreshTime--;
    if (refreshTime < 0) {
        refreshTime = 60;
        fetchStatus();
    }
}

fetchStatus();
setInterval(updateCountdown, 1000);
