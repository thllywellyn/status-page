const API_KEY = "u2087289-165655ede6169c02fa041e78";
const PROXY_URL = "https://uptime-router.lsana.workers.dev";
const API_URL = "https://api.uptimerobot.com/v2/getMonitors";
const monitorList = document.getElementById("monitor-list");
const lastUpdated = document.getElementById("last-updated");
const countdown = document.getElementById("countdown");
const themeToggle = document.getElementById("theme-toggle");

let refreshTime = 60;
let currentTheme = localStorage.getItem('theme') || 'auto';

// Theme handling
function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    
    if (theme === 'auto') {
        document.body.removeAttribute('data-theme');
    } else {
        document.body.setAttribute('data-theme', theme);
    }
    
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

themeToggle.addEventListener('click', () => {
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
});

// Initialize theme
setTheme(currentTheme);

function showLoading() {
    monitorList.innerHTML = '<div class="loading-skeleton">Loading services...</div>'.repeat(3);
}

function showError(message) {
    const errorHtml = `
        <li style="background-color: var(--status-down); justify-content: center; cursor: default">
            <span>❌ ${message}</span>
        </li>
    `;
    monitorList.innerHTML = errorHtml;
}

function formatUptime(uptime) {
    return parseFloat(uptime).toFixed(2);
}

function formatDateTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}

function getResponseTimeStatus(responseTime) {
    if (responseTime < 300) return '🟢 Excellent';
    if (responseTime < 1000) return '🟡 Good';
    return '🟠 Slow';
}

function createMonitorElement(monitor) {
    const uptime = formatUptime(monitor.all_time_uptime_ratio || 0);
    const statusClass = monitor.status === 2 ? "online" : "offline";
    
    const li = document.createElement("li");
    li.classList.add(statusClass);
    li.setAttribute('role', 'button');
    li.setAttribute('aria-expanded', 'false');
    li.setAttribute('tabindex', '0');
    
    const lastLog = monitor.logs?.[0] || {};
    const responseTime = lastLog.response_time || 0;
    
    li.innerHTML = `
        <div class="monitor-header">
            <span>${monitor.friendly_name}</span>
            <span class="status">${monitor.status === 2 ? "🟢 Up" : "🔴 Down"}</span>
        </div>
        <div class="monitor-details">
            <div class="detail-item">
                <span class="detail-label">Uptime</span>
                <span>${uptime}%</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Response Time</span>
                <span>${responseTime}ms (${getResponseTimeStatus(responseTime)})</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Last Checked</span>
                <span>${formatDateTime(lastLog.datetime || Date.now() / 1000)}</span>
            </div>
            ${monitor.url ? `
                <a href="${monitor.url}" target="_blank" rel="noopener noreferrer" class="open-link" onclick="event.stopPropagation()">
                    🔗 Open URL in new tab
                </a>
            ` : ''}
        </div>
    `;

    // Add click handler
    li.addEventListener('click', (event) => {
        const wasExpanded = li.getAttribute('aria-expanded') === 'true';
        const details = li.querySelector('.monitor-details');
        
        // Close any other open details
        document.querySelectorAll('.monitor-list li[aria-expanded="true"]').forEach(item => {
            if (item !== li) {
                item.setAttribute('aria-expanded', 'false');
                item.querySelector('.monitor-details').classList.remove('show');
            }
        });

        // Toggle current details
        li.setAttribute('aria-expanded', !wasExpanded);
        details.classList.toggle('show');

        // Prevent event from bubbling up to document
        event.stopPropagation();
    });

    // Add keyboard support
    li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            li.click();
        }
    });

    return li;
}

// Add click outside handler to close any open details
document.addEventListener('click', (event) => {
    const openDetails = document.querySelectorAll('.monitor-list li[aria-expanded="true"]');
    if (openDetails.length > 0) {
        openDetails.forEach(item => {
            // Check if click was outside of any monitor item
            if (!item.contains(event.target)) {
                item.setAttribute('aria-expanded', 'false');
                item.querySelector('.monitor-details').classList.remove('show');
            }
        });
    }
});

async function fetchStatus() {
    showLoading();
    
    try {
        const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(API_URL)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: `api_key=${API_KEY}&format=json&logs=1&all_time_uptime_ratio=1`,
            timeout: 10000 // 10 second timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                errorText
            });
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data) {
            throw new Error('No data received from API');
        }

        if (data.stat === 'fail') {
            throw new Error(`API Error: ${data.error?.message || 'Unknown error'}`);
        }

        if (!data.monitors || !Array.isArray(data.monitors)) {
            throw new Error('Invalid data format: missing monitors array');
        }

        monitorList.innerHTML = "";
        let allOnline = true;

        data.monitors
            .sort((a, b) => b.status - a.status)
            .forEach(monitor => {
                if (monitor.status !== 2) allOnline = false;
                monitorList.appendChild(createMonitorElement(monitor));
            });

        const summaryEl = document.getElementById("status-summary");
        summaryEl.textContent = allOnline ? "✅ All systems operational" : "⚠️ Some systems are down";
        summaryEl.style.color = allOnline ? 'var(--status-up)' : 'var(--status-down)';
        
        lastUpdated.textContent = new Date().toLocaleTimeString();

    } catch (error) {
        console.error("Error fetching data:", error);
        const errorMessage = error.message.includes('API Error') 
            ? error.message 
            : "Failed to fetch status data. Please try again later.";
        
        showError(errorMessage);
        document.getElementById("status-summary").textContent = "❌ Failed to fetch data";
        
        // Retry after 30 seconds on error instead of 60
        refreshTime = 30;
    }
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

// Handle visibility change to refresh data when tab becomes visible
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        fetchStatus();
        refreshTime = 60;
    }
});

// Update the initialization to handle initial errors better
window.addEventListener('load', () => {
    fetchStatus().catch(error => {
        console.error('Initial load failed:', error);
    });
});

// Keep the existing interval
setInterval(updateCountdown, 1000);
