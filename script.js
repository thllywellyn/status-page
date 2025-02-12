const API_KEY = "u2087289-165655ede6169c02fa041e78";
const monitorList = document.getElementById("monitor-list");

fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `api_key=${API_KEY}&format=json&logs=1`
})
.then(response => response.json())
.then(data => {
    data.monitors.forEach(monitor => {
        const li = document.createElement("li");
        li.textContent = `${monitor.friendly_name}: ${monitor.status === 2 ? "🟢 Online" : "🔴 Offline"}`;
        li.className = monitor.status === 2 ? "online" : "offline";
        monitorList.appendChild(li);
    });
})
.catch(error => console.error("Error fetching data:", error));
