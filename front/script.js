// Глобальные переменные
let currentResults = null;
let secretsChart = null;
let riskChart = null;

// Навигация
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');
        
        if (page === 'reports') {
            loadReports();
        }
    });
});

// Сканирование
document.getElementById('start-scan').addEventListener('click', async () => {
    const repoPath = document.getElementById('repo-path').value;
    const scanHistory = document.getElementById('scan-history').checked;
    
    const progressContainer = document.getElementById('scan-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const statsGrid = document.getElementById('scan-stats');
    
    progressContainer.style.display = 'block';
    statsGrid.style.display = 'none';
    progressFill.style.width = '0%';
    
    // Анимация прогресса
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        if (progress > 90) progress = 90;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Сканирование... ${progress}%`;
    }, 200);
    
    try {
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: repoPath, scan_history: scanHistory })
        });
        
        const results = await response.json();
        
        clearInterval(interval);
        progressFill.style.width = '100%';
        progressText.textContent = 'Сканирование завершено!';
        
        if (results.error) {
            alert(`Ошибка: ${results.error}`);
            return;
        }
        
        currentResults = results;
        displayStats(results.stats);
        displayFindings(results.findings);
        displayCharts(results.findings);
        
        setTimeout(() => {
            document.querySelector('[data-page="results"]').click();
        }, 1000);
        
    } catch (error) {
        clearInterval(interval);
        alert(`Ошибка сканирования: ${error.message}`);
    }
});

// Отображение статистики
function displayStats(stats) {
    document.getElementById('stat-files').textContent = stats.total_files;
    document.getElementById('stat-secrets').textContent = stats.total_secrets;
    document.getElementById('stat-high').textContent = stats.high_risk;
    document.getElementById('stat-medium').textContent = stats.medium_risk;
    document.getElementById('stat-low').textContent = stats.low_risk;
    document.getElementById('scan-stats').style.display = 'grid';
}

// Отображение находок
function displayFindings(findings) {
    const tbody = document.getElementById('findings-body');
    tbody.innerHTML = '';
    
    findings.forEach(finding => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${finding.file}</td>
            <td>${finding.rule_name}</td>
            <td><span class="badge badge-${finding.severity}">${finding.severity}</span></td>
            <td>${finding.line}</td>
            <td><code>${finding.commit}</code></td>
            <td>
                <button class="btn btn-sm" onclick="viewSecret('${finding.id}')">👁️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Графики
function displayCharts(findings) {
    // Типы секретов
    const secretTypes = {};
    findings.forEach(f => {
        secretTypes[f.rule_name] = (secretTypes[f.rule_name] || 0) + 1;
    });
    
    const secretsCtx = document.getElementById('secrets-chart').getContext('2d');
    if (secretsChart) secretsChart.destroy();
    
    secretsChart = new Chart(secretsCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(secretTypes),
            datasets: [{
                data: Object.values(secretTypes),
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8' } }
            }
        }
    });
    
    // Уровень риска
    const riskData = {
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length
    };
    
    const riskCtx = document.getElementById('risk-chart').getContext('2d');
    if (riskChart) riskChart.destroy();
    
    riskChart = new Chart(riskCtx, {
        type: 'bar',
        data: {
            labels: ['Высокий', 'Средний', 'Низкий'],
            datasets: [{
                label: 'Количество',
                data: [riskData.high, riskData.medium, riskData.low],
                backgroundColor: ['#ef4444', '#f97316', '#eab308']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#94a3b8' } },
                x: { ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// Загрузка отчётов
async function loadReports() {
    const response = await fetch('/api/reports');
    const reports = await response.json();
    
    const list = document.getElementById('reports-list');
    list.innerHTML = '';
    
    reports.forEach(report => {
        const item = document.createElement('div');
        item.className = 'report-item';
        item.innerHTML = `
            <span>📄 ${report}</span>
            <a href="/api/reports/${report}" download>⬇️ Скачать</a>
        `;
        list.appendChild(item);
    });
}

// Просмотр секрета
function viewSecret(id) {
    if (currentResults) {
        const finding = currentResults.findings.find(f => f.id === id);
        if (finding) {
            alert(`Секрет найден в:\nФайл: ${finding.file}\nСтрока: ${finding.line}\nТип: ${finding.rule_name}\n\n⚠️ Полный секрет скрыт в целях безопасности`);
        }
    }
}

// Настройки
document.getElementById('entropy-threshold').addEventListener('input', (e) => {
    document.getElementById('entropy-value').textContent = e.target.value;
});