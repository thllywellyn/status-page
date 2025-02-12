let API_KEY;

fetch("api_key.js")
  .then(response => response.text())
  .then(text => {
    eval(text);  // Loads API_KEY from api_key.js

    fetch("https://api.uptimerobot.com/v2/getMonitors", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `api_key=${API_KEY}&format=json&logs=1`
    })
    .then(response => response.json())
    .then(data => {
        const monitorList = document.getElementById("monitor-list");
        data.monitors.forEach(monitor => {
            const li = document.createElement("li");
            li.textContent = `${monitor.friendly_name}: ${monitor.status === 2 ? "🟢 Online" : "🔴 Offline"}`;
            li.className = monitor.status === 2 ? "online" : "offline";
            monitorList.appendChild(li);
        });
    })
    .catch(error => console.error("Error fetching data:", error));
  });
