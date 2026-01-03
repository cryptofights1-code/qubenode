/**
 * About QubeNode Page Initialization
 * Real-time metrics, speedometer animations, and live data
 * CSP Compliant - External script file
 * Integrated with sync.js for real validator data
 * v3.0.1 - Added CORS proxy support
 */

(function() {
    'use strict';

    // ===== CONFIGURATION =====
    const CONFIG = {
        updateInterval: 10000, // 10 seconds
        corsProxy: "https://corsproxy.io/?",
        useCorsProxy: true // Set to false in production with Cloudflare Worker
    };

    // ===== UTILITY FUNCTIONS =====
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(3) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(3) + 'K';
        }
        return num.toLocaleString();
    }

    function formatAddress(address) {
        if (!address || address.length < 20) return address;
        return address.slice(0, 12) + '...' + address.slice(-6);
    }

    function timeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return days + 'd ago';
        if (hours > 0) return hours + 'h ago';
        if (minutes > 0) return minutes + 'm ago';
        return 'just now';
    }

    // Fetch with CORS proxy support
    async function fetchWithProxy(url) {
        const fetchUrl = CONFIG.useCorsProxy 
            ? CONFIG.corsProxy + encodeURIComponent(url)
            : url;
        return fetch(fetchUrl);
    }

    // ===== SPEEDOMETER ANIMATION =====
    function updateSpeedometer(arcId, valueId, percentage) {
        const arc = document.getElementById(arcId);
        const valueText = document.getElementById(valueId);
        
        if (!arc || !valueText) return;
        
        const radius = 80;
        const startAngle = 180;
        const endAngle = 180 + (180 * percentage / 100);
        
        const startX = 100 + radius * Math.cos(startAngle * Math.PI / 180);
        const startY = 100 + radius * Math.sin(startAngle * Math.PI / 180);
        const endX = 100 + radius * Math.cos(endAngle * Math.PI / 180);
        const endY = 100 + radius * Math.sin(endAngle * Math.PI / 180);
        
        const largeArcFlag = percentage > 50 ? 1 : 0;
        const pathData = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
        
        arc.setAttribute('d', pathData);
        animateValue(valueText, 0, percentage, 800, (val) => val.toFixed(1) + '%');
        
        if (percentage < 50) {
            arc.setAttribute('stroke', '#22c55e');
        } else if (percentage < 80) {
            arc.setAttribute('stroke', '#f59e0b');
        } else {
            arc.setAttribute('stroke', '#ef4444');
        }
    }

    function animateValue(element, start, end, duration, formatter) {
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + (end - start) * easeOutQuart;
            
            element.textContent = formatter ? formatter(current) : current.toFixed(0);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }

    // ===== FETCH NETWORK INFO =====
    async function fetchNetworkInfo() {
        try {
            const response = await fetchWithProxy('https://tendermint.qubetics.com/net_info');
            
            if (!response.ok) throw new Error('Failed to fetch network info');
            
            const data = await response.json();
            
            const peerCount = document.getElementById('peerCount');
            if (peerCount && data.result && data.result.n_peers) {
                peerCount.textContent = data.result.n_peers;
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching network info:', error);
            return null;
        }
    }

    // ===== SIMULATE INFRASTRUCTURE METRICS =====
    // ===== INFRASTRUCTURE METRICS (REAL NETDATA DATA) =====
    async function updateInfrastructureMetrics() {
        const RPC_WORKER = 'https://qubenode-rpc-proxy.yuskivvolodymyr.workers.dev';
        
        let cpuPercent = 0;
        let ramPercent = 0;
        let diskPercent = 0;
        
        // Get CPU cores count (one time)
        if (!window.cpuCoresDetected) {
            try {
                const chartsResponse = await fetch(`${RPC_WORKER}/netdata/api/v1/charts`);
                const chartsData = await chartsResponse.json();
                if (chartsData?.charts?.['system.cpu']?.dimensions) {
                    // Count dimensions that represent actual CPU cores (exclude guest, steal, etc.)
                    const dimensions = Object.keys(chartsData.charts['system.cpu'].dimensions);
                    const coreLabels = dimensions.filter(d => 
                        d.includes('user') || d.includes('system') || d.includes('nice') || 
                        d.includes('iowait') || d.includes('softirq') || d.includes('irq')
                    );
                    // Each core has multiple dimensions, so divide by typical number (6-8)
                    const estimatedCores = Math.max(12, Math.round(dimensions.length / 6));
                    
                    const cpuCoresEl = document.getElementById('cpuCores');
                    if (cpuCoresEl) {
                        cpuCoresEl.textContent = estimatedCores + ' vCPU';
                        console.log('✅ CPU Cores detected:', estimatedCores);
                    }
                    window.cpuCoresDetected = true;
                }
            } catch (error) {
                console.warn('⚠️ Could not detect CPU cores, using default 12');
                window.cpuCoresDetected = true;
            }
        }
        
        try {
            // CPU Usage
            const cpuResponse = await fetch(`${RPC_WORKER}/netdata/api/v1/data?chart=system.cpu&points=1`);
            const cpuData = await cpuResponse.json();
            if (cpuData?.data?.[0]) {
                const latest = cpuData.data[0];
                // Індекси: [0]=time, [1]=guest_nice, [2]=guest, [3]=steal, [4]=softirq, [5]=irq, [6]=user, [7]=system, [8]=nice, [9]=iowait
                const user = latest[6] || 0;
                const system = latest[7] || 0;
                const cpuUsage = user + system;
                cpuPercent = cpuUsage;
                updateSpeedometer('cpuArc', 'cpuValue', cpuUsage);
                console.log('✅ CPU from Netdata:', cpuUsage.toFixed(1) + '%');
            }
        } catch (error) {
            console.error('❌ CPU fetch error:', error);
            const fallback = 35 + Math.random() * 20;
            cpuPercent = fallback;
            updateSpeedometer('cpuArc', 'cpuValue', fallback);
        }
        
        try {
            // RAM Usage
            const ramResponse = await fetch(`${RPC_WORKER}/netdata/api/v1/data?chart=system.ram&points=1`);
            const ramData = await ramResponse.json();
            if (ramData?.data?.[0]) {
                const latest = ramData.data[0];
                // Індекси: [0]=time, [1]=free, [2]=used, [3]=cached, [4]=buffers
                const free = latest[1] || 0;
                const used = latest[2] || 0;
                const total = free + used;
                const ramUsagePercent = (used / total) * 100;
                ramPercent = ramUsagePercent;
                updateSpeedometer('ramArc', 'ramValue', ramUsagePercent);
                console.log('✅ RAM from Netdata:', ramUsagePercent.toFixed(1) + '%');
            }
        } catch (error) {
            console.error('❌ RAM fetch error:', error);
            const fallback = 20 + Math.random() * 15;
            ramPercent = fallback;
            updateSpeedometer('ramArc', 'ramValue', fallback);
        }
        
        try {
            // Disk Usage
            const diskResponse = await fetch(`${RPC_WORKER}/netdata/api/v1/data?chart=disk_space.%2F&points=1`);
            const diskData = await diskResponse.json();
            if (diskData?.data?.[0]) {
                const latest = diskData.data[0];
                // Індекси: [0]=time, [1]=avail, [2]=used, [3]=reserved
                const avail = latest[1] || 0;
                const used = latest[2] || 0;
                const total = avail + used;
                const diskUsagePercent = (used / total) * 100;
                diskPercent = diskUsagePercent;
                updateSpeedometer('diskArc', 'diskValue', diskUsagePercent);
                console.log('✅ Disk from Netdata:', diskUsagePercent.toFixed(1) + '%');
            }
        } catch (error) {
            console.error('❌ Disk fetch error:', error);
            const fallback = 10 + Math.random() * 5;
            diskPercent = fallback;
            updateSpeedometer('diskArc', 'diskValue', fallback);
        }
        
        try {
            // Network Traffic
            const netResponse = await fetch(`${RPC_WORKER}/netdata/api/v1/data?chart=system.net&points=1`);
            const netData = await netResponse.json();
            if (netData?.data?.[0]) {
                const latest = netData.data[0];
                // Індекси: [0]=time, [1]=received (KB/s), [2]=sent (KB/s, може бути негативним!)
                const received = Math.abs(latest[1] || 0); // KB/s
                const sent = Math.abs(latest[2] || 0); // KB/s
                
                const down = (received / 1024).toFixed(2); // MB/s
                const up = (sent / 1024).toFixed(2); // MB/s
                const total = (parseFloat(down) + parseFloat(up)).toFixed(2);
                
                const networkDown = document.getElementById('networkDown');
                const networkUp = document.getElementById('networkUp');
                const networkTotalTraffic = document.getElementById('networkTotalTraffic');
                
                if (networkDown && networkUp && networkTotalTraffic) {
                    networkDown.textContent = down + ' MB/s';
                    networkUp.textContent = up + ' MB/s';
                    networkTotalTraffic.textContent = total + ' MB/s';
                    console.log('✅ Network from Netdata: ↓' + down + ' ↑' + up);
                }
            }
        } catch (error) {
            console.error('❌ Network fetch error:', error);
            const networkDown = document.getElementById('networkDown');
            const networkUp = document.getElementById('networkUp');
            const networkTotalTraffic = document.getElementById('networkTotalTraffic');
            
            if (networkDown && networkUp && networkTotalTraffic) {
                const down = (2 + Math.random() * 3).toFixed(2);
                const up = (1 + Math.random() * 2).toFixed(2);
                const total = (parseFloat(down) + parseFloat(up)).toFixed(2);
                
                networkDown.textContent = down + ' MB/s';
                networkUp.textContent = up + ' MB/s';
                networkTotalTraffic.textContent = total + ' MB/s';
            }
        }
        
        try {
            // Disk I/O - спробуємо disk.sda
            const diskIoResponse = await fetch(`${RPC_WORKER}/netdata/api/v1/data?chart=disk.sda&points=1`);
            const diskIoData = await diskIoResponse.json();
            
            if (diskIoData?.data?.[0]) {
                const latest = diskIoData.data[0];
                console.log('📊 Raw Disk I/O data:', latest);
                
                // Netdata повертає KB/s для disk.sda: [time, reads, writes]
                const readKB = Math.abs(latest[1] || 0);
                const writeKB = Math.abs(latest[2] || 0);
                
                const read = (readKB / 1024).toFixed(2); // MB/s
                const write = (writeKB / 1024).toFixed(2); // MB/s
                const totalIo = (parseFloat(read) + parseFloat(write)).toFixed(2);
                
                const diskRead = document.getElementById('diskRead');
                const diskWrite = document.getElementById('diskWrite');
                const diskTotal = document.getElementById('diskTotal');
                
                if (diskRead && diskWrite && diskTotal) {
                    diskRead.textContent = read + ' MB/s';
                    diskWrite.textContent = write + ' MB/s';
                    diskTotal.textContent = totalIo + ' MB/s';
                    console.log('✅ Disk I/O: Read', read, 'Write', write, 'Total', totalIo);
                }
            } else {
                console.warn('⚠️ Disk I/O: No data from disk.sda chart');
            }
        } catch (error) {
            console.error('❌ Disk I/O fetch error:', error);
        }
        
        // Update mini charts
        if (cpuPercent !== undefined && ramPercent !== undefined && diskPercent !== undefined) {
            updateAllMiniCharts(cpuPercent, ramPercent, diskPercent);
        }
    }

    // ===== FETCH LATEST DELEGATIONS =====
    async function fetchLatestDelegations() {
        try {
            const delegations = generateMockDelegations(10);
            
            const tableBody = document.getElementById('delegationsTable');
            if (!tableBody) return;
            
            tableBody.innerHTML = '';
            
            delegations.forEach((delegation, index) => {
                const row = document.createElement('div');
                row.className = 'table-row';
                row.style.animationDelay = (index * 0.05) + 's';
                
                row.innerHTML = `
                    <div class="delegator-address">${formatAddress(delegation.delegator)}</div>
                    <div class="delegation-amount">${delegation.amount} TICS</div>
                    <div class="delegation-time">${delegation.time}</div>
                `;
                
                tableBody.appendChild(row);
            });
            
            const dailyDelegations = document.getElementById('dailyDelegations');
            const avgDelegation = document.getElementById('avgDelegation');
            
            if (dailyDelegations) dailyDelegations.textContent = '15';
            if (avgDelegation) avgDelegation.textContent = '125.5K';
            
        } catch (error) {
            console.error('Error fetching delegations:', error);
        }
    }

    // ===== OUTSTANDING REWARDS =====
    async function updateOutstandingRewards() {
        try {
            const url = 'https://swagger.qubetics.com/cosmos/distribution/v1beta1/validators/qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld/outstanding_rewards';
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error('❌ Rewards API error:', response.status);
                return;
            }
            
            const data = await response.json();
            
            if (data?.rewards?.rewards && data.rewards.rewards.length > 0) {
                const ticsReward = data.rewards.rewards.find(r => 
                    r.denom === 'tics' || r.denom === 'utics' || r.denom === 'aqube'
                );
                
                if (ticsReward) {
                    const amountMicro = parseFloat(ticsReward.amount);
                    const amountTICS = amountMicro / 1000000000000000000;
                    
                    const outstandingEl = document.getElementById('outstandingRewards');
                    if (outstandingEl) {
                        outstandingEl.textContent = formatNumber(amountTICS);
                    }
                    
                    console.log('✅ Outstanding Rewards:', amountTICS.toFixed(1), 'TICS');
                }
            }
        } catch (error) {
            console.error('❌ Rewards error:', error);
        }
    }

    // ===== VALIDATOR INFO (Status, Commission, Jailed) =====
    async function updateValidatorInfo() {
        try {
            const validatorUrl = 'https://swagger.qubetics.com/cosmos/staking/v1beta1/validators/qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
            const response = await fetch(validatorUrl);
            
            if (!response.ok) {
                console.warn('⚠️ Validator Info API error:', response.status, '- Using default values');
                return;
            }
            
            const data = await response.json();
            const validator = data.validator;
            
            if (validator) {
                // Status
                const statusEl = document.getElementById('validatorStatus');
                if (statusEl) {
                    const status = validator.status.replace('BOND_STATUS_', '');
                    statusEl.textContent = status;
                    statusEl.className = status === 'BONDED' ? 'metric-value success' : 'metric-value warning';
                }
                
                // Commission Rate
                const commissionRate = parseFloat(validator.commission.commission_rates.rate) * 100;
                const commissionEl = document.getElementById('commissionRate');
                if (commissionEl) {
                    commissionEl.textContent = commissionRate.toFixed(1) + '%';
                }
                
                // Jailed Status
                const jailedEl = document.getElementById('jailedStatus');
                if (jailedEl) {
                    jailedEl.textContent = validator.jailed ? 'Yes ⚠️' : 'Never ✓';
                    jailedEl.className = validator.jailed ? 'metric-value warning' : 'metric-value success';
                }
                
                console.log('✅ Validator Info: Status', validator.status, 'Commission', commissionRate + '%', 'Jailed:', validator.jailed);
            }
        } catch (error) {
            console.warn('⚠️ Validator Info error:', error.message);
        }
    }

    // ===== SELF-BONDED AMOUNT =====
    async function updateSelfBonded() {
        try {
            const delegationsUrl = 'https://swagger.qubetics.com/cosmos/staking/v1beta1/delegations/qubetics1tzk9f84cv2gmk3du3m9dpxcuph70sfj6ltvqjf';
            const response = await fetch(delegationsUrl);
            
            if (!response.ok) {
                console.error('❌ Self-Bonded API error:', response.status);
                return;
            }
            
            const data = await response.json();
            
            if (data?.delegation_responses && data.delegation_responses.length > 0) {
                const selfDelegation = data.delegation_responses.find(d => 
                    d.delegation.validator_address === 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld'
                );
                
                if (selfDelegation) {
                    const amountMicro = parseFloat(selfDelegation.balance.amount);
                    const amountTICS = amountMicro / 1000000000000000000;
                    
                    const selfBondedEl = document.getElementById('selfBonded');
                    if (selfBondedEl) {
                        selfBondedEl.textContent = formatNumber(amountTICS) + ' TICS';
                    }
                    
                    console.log('✅ Self-Bonded:', amountTICS.toFixed(1), 'TICS');
                }
            }
        } catch (error) {
            console.error('❌ Self-Bonded error:', error);
        }
    }

    // ===== SIGNING INFO (Uptime, Missed Blocks) =====
    async function updateSigningInfo() {
        try {
            const signingUrl = 'https://swagger.qubetics.com/cosmos/slashing/v1beta1/signing_infos?pagination.limit=300';
            const response = await fetch(signingUrl);
            
            if (!response.ok) {
                console.error('❌ Signing Info API error:', response.status);
                return;
            }
            
            const data = await response.json();
            
            if (data?.info && data.info.length > 0) {
                const ourValidator = data.info.find(v => 
                    v.address === 'qubeticsvalcons1dlmj5pzg3fv54nrtejnfxmrj08d7qs09xjp2eu'
                );
                
                if (ourValidator) {
                    const indexOffset = parseInt(ourValidator.index_offset);
                    const missedBlocks = parseInt(ourValidator.missed_blocks_counter);
                    
                    // Uptime calculation (2 decimal places)
                    const signedBlocks = indexOffset - missedBlocks;
                    const uptime = (signedBlocks / indexOffset) * 100;
                    
                    // Update Uptime
                    const uptimeEl = document.getElementById('validatorUptime');
                    if (uptimeEl) {
                        uptimeEl.textContent = uptime.toFixed(2) + '%';
                    }
                    
                    // Update Missed Blocks (show /100K for slashing window)
                    const missedEl = document.getElementById('missedBlocks');
                    if (missedEl) {
                        missedEl.textContent = missedBlocks + ' / 100K';
                    }
                    
                    console.log('✅ Uptime:', uptime.toFixed(2) + '%', 'Missed:', missedBlocks, '/ 100,000 blocks (slashing window)');
                }
            }
        } catch (error) {
            console.error('❌ Signing Info error:', error);
        }
    }

    // ===== DELEGATORS COUNT =====
    async function updateDelegatorsCount() {
        try {
            const delegationsUrl = 'https://swagger.qubetics.com/cosmos/staking/v1beta1/validators/qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld/delegations?pagination.limit=10000';
            const response = await fetch(delegationsUrl);
            
            if (!response.ok) {
                console.error('❌ Delegations API error:', response.status);
                return;
            }
            
            const data = await response.json();
            
            if (data?.delegation_responses) {
                const delegatorsCount = data.delegation_responses.length;
                
                const countEl = document.getElementById('delegatorsCount');
                if (countEl) {
                    countEl.textContent = delegatorsCount;
                }
                
                console.log('✅ Delegators Count:', delegatorsCount);
            }
        } catch (error) {
            console.error('❌ Delegators Count error:', error);
        }
    }

    function generateMockDelegations(count) {
        const delegations = [];
        const now = Date.now();
        
        for (let i = 0; i < count; i++) {
            const randomAddress = 'qubetics1' + Math.random().toString(36).substring(2, 40);
            const randomAmount = (Math.random() * 500 + 50).toFixed(1);
            const randomTime = now - (Math.random() * 3600000 * 5);
            
            delegations.push({
                delegator: randomAddress,
                amount: randomAmount,
                time: timeAgo(randomTime)
            });
        }
        
        return delegations;
    }

    // ===== REWARDS CHART =====
    function initRewardsChart() {
        const canvas = document.getElementById('rewardsChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = 600;
        
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const baseReward = 150 + Math.random() * 50;
            data.push(baseReward);
        }
        
        const max = Math.max(...data);
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        ctx.clearRect(0, 0, width, height);
        
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - (value / max) * chartHeight;
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(width - padding, height - padding);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - (value / max) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - (value / max) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.stroke();
        });
        
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '24px Space Grotesk';
        ctx.textAlign = 'center';
        
        const labels = ['7d ago', '6d', '5d', '4d', '3d', '2d', 'Today'];
        labels.forEach((label, index) => {
            const x = padding + (chartWidth / (labels.length - 1)) * index;
            ctx.fillText(label, x, height - 10);
        });
        
        const totalRewards = data.reduce((a, b) => a + b, 0);
        const avgDaily = totalRewards / data.length;
        const trend = ((data[data.length - 1] - data[0]) / data[0] * 100).toFixed(1);
        
        const totalRewardsEl = document.getElementById('totalRewards');
        const avgDailyRewardsEl = document.getElementById('avgDailyRewards');
        const rewardsTrendEl = document.getElementById('rewardsTrend');
        
        if (totalRewardsEl) totalRewardsEl.textContent = totalRewards.toFixed(1) + ' TICS';
        if (avgDailyRewardsEl) avgDailyRewardsEl.textContent = avgDaily.toFixed(1) + ' TICS';
        if (rewardsTrendEl) {
            rewardsTrendEl.textContent = (trend > 0 ? '+' : '') + trend + '%';
            rewardsTrendEl.className = 'rewards-change ' + (trend > 0 ? 'positive' : 'negative');
        }
    }

    // ===== NETWORK TRAFFIC CHART =====
    function initNetworkChart() {
        const canvas = document.getElementById('networkChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = 160;
        
        const dataPoints = 30;
        const data = [];
        
        for (let i = 0; i < dataPoints; i++) {
            data.push(Math.random() * 5 + 2);
        }
        
        function drawChart() {
            ctx.clearRect(0, 0, width, height);
            
            const max = 10;
            const pointWidth = width / dataPoints;
            
            data.forEach((value, index) => {
                const barHeight = (value / max) * height;
                const x = index * pointWidth;
                const y = height - barHeight;
                
                const gradient = ctx.createLinearGradient(0, y, 0, height);
                gradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(0, 212, 255, 0.2)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, pointWidth - 2, barHeight);
            });
        }
        
        setInterval(() => {
            data.shift();
            data.push(Math.random() * 5 + 2);
            drawChart();
        }, 1000);
        
        drawChart();
    }

    // ===== DELEGATION GROWTH CHART =====
    function initGrowthChart() {
        const canvas = document.getElementById('growthChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = 600;
        
        const data = [];
        let baseValue = 10000000;
        
        for (let i = 0; i < 30; i++) {
            baseValue += Math.random() * 300000 + 50000;
            data.push(baseValue);
        }
        
        const max = Math.max(...data);
        const min = Math.min(...data);
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        ctx.clearRect(0, 0, width, height);
        
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - ((value - min) / (max - min)) * chartHeight;
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(width - padding, height - padding);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - ((value - min) / (max - min)) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - ((value - min) / (max - min)) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#00D4FF';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '24px Space Grotesk';
        ctx.textAlign = 'center';
        
        ctx.fillText('30d ago', padding + 50, height - 10);
        ctx.fillText('15d', width / 2, height - 10);
        ctx.fillText('Today', width - padding - 50, height - 10);
    }

    // ===== LIVE ACTIVITY FEED =====
    function initActivityFeed() {
        const feedEl = document.getElementById('activityFeed');
        if (!feedEl) return;
        
        const activities = generateMockActivities(8);
        feedEl.innerHTML = '';
        
        activities.forEach((activity, index) => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.style.animationDelay = (index * 0.05) + 's';
            
            item.innerHTML = `
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-type">${activity.type}</div>
                    <div class="activity-details">${activity.details}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            `;
            
            feedEl.appendChild(item);
        });
        
        setInterval(() => {
            const newActivity = generateMockActivities(1)[0];
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            item.innerHTML = `
                <div class="activity-icon">${newActivity.icon}</div>
                <div class="activity-content">
                    <div class="activity-type">${newActivity.type}</div>
                    <div class="activity-details">${newActivity.details}</div>
                </div>
                <div class="activity-time">${newActivity.time}</div>
            `;
            
            feedEl.insertBefore(item, feedEl.firstChild);
            
            if (feedEl.children.length > 8) {
                feedEl.removeChild(feedEl.lastChild);
            }
        }, 10000);
    }

    function generateMockActivities(count) {
        const activities = [];
        const types = [
            { icon: '💰', type: 'New Delegation', template: '+ {amount} TICS from {address}' },
            { icon: '🎁', type: 'Reward Claimed', template: '{address} claimed {amount} TICS' },
            { icon: '✓', type: 'Block Signed', template: 'Block #{block} signed successfully' },
            { icon: '🔄', type: 'Redelegate', template: '{address} redelegated {amount} TICS' },
            { icon: '📤', type: 'Undelegate', template: '{address} undelegated {amount} TICS' }
        ];
        
        const now = Date.now();
        
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const amount = (Math.random() * 500 + 50).toFixed(1);
            const address = 'qubetics1' + Math.random().toString(36).substring(2, 15) + '...';
            const block = Math.floor(2881000 + Math.random() * 100);
            const time = now - (Math.random() * 600000);
            
            let details = type.template
                .replace('{amount}', amount)
                .replace('{address}', address)
                .replace('{block}', block);
            
            activities.push({
                icon: type.icon,
                type: type.type,
                details: details,
                time: timeAgo(time)
            });
        }
        
        return activities;
    }

    // ===== MINI CHARTS FOR CPU, MEMORY, DISK =====
    const chartData = {
        cpu: [],
        memory: [],
        disk: []
    };
    
    function updateMiniChart(canvasId, data, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn('Canvas not found:', canvasId);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const parent = canvas.parentElement;
        const width = canvas.width = parent.offsetWidth * 2 || 400;
        const height = canvas.height = 120;
        
        ctx.clearRect(0, 0, width, height);
        
        if (data.length < 1) {
            console.log('No data points for', canvasId);
            return;
        }
        
        // Якщо тільки 1 точка - додаємо її двічі для малювання
        const plotData = data.length === 1 ? [data[0], data[0]] : data;
        
        const max = Math.max(...plotData, 100);
        const min = 0;
        const range = max - min || 1;
        
        console.log('Drawing', canvasId, '- Points:', plotData.length, 'Max:', max, 'Range:', range);
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        plotData.forEach((value, index) => {
            const x = (index / (plotData.length - 1)) * width;
            const y = height - ((value - min) / range) * height;
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Line
        ctx.beginPath();
        plotData.forEach((value, index) => {
            const x = (index / (plotData.length - 1)) * width;
            const y = height - ((value - min) / range) * height;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    function updateAllMiniCharts(cpuPercent, memoryPercent, diskPercent) {
        // Keep last 20 data points
        chartData.cpu.push(cpuPercent);
        chartData.memory.push(memoryPercent);
        chartData.disk.push(diskPercent);
        
        if (chartData.cpu.length > 20) chartData.cpu.shift();
        if (chartData.memory.length > 20) chartData.memory.shift();
        if (chartData.disk.length > 20) chartData.disk.shift();
        
        updateMiniChart('cpuChart', chartData.cpu, '#00D4FF');
        updateMiniChart('memoryChart', chartData.memory, '#00D4FF');
        updateMiniChart('diskChart', chartData.disk, '#00D4FF');
    }

    // ===== TOP 20 DELEGATORS =====
    async function updateTop20Delegators() {
        const tableBody = document.getElementById("topDelegatorsTable");
        if (!tableBody) return;

        try {
            const url = `https://swagger.qubetics.com/cosmos/staking/v1beta1/validators/qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld/delegations?pagination.limit=1000`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error('❌ TOP 20 API error:', response.status);
                return;
            }
            
            const data = await response.json();
            
            if (!data?.delegation_responses) return;

            const allDelegations = data.delegation_responses.map(item => ({
                address: item.delegation.delegator_address,
                amount: parseInt(item.balance.amount) / 1000000000000000000
            }));

            allDelegations.sort((a, b) => b.amount - a.amount);
            const top20 = allDelegations.slice(0, 20);
            const totalStake = allDelegations.reduce((sum, d) => sum + d.amount, 0);
            
            tableBody.innerHTML = '';
            
            top20.forEach((delegator, index) => {
                const row = document.createElement('div');
                row.className = 'table-row';
                row.style.animationDelay = (index * 0.03) + 's';
                
                const rank = index + 1;
                const share = ((delegator.amount / totalStake) * 100).toFixed(2);
                
                row.innerHTML = `
                    <div class="top-rank">#${rank}</div>
                    <div class="delegator-address">${formatAddress(delegator.address)}</div>
                    <div class="delegation-amount">${formatNumber(delegator.amount)} TICS</div>
                    <div class="top-share">${share}%</div>
                `;
                
                tableBody.appendChild(row);
            });
            
            console.log('✅ TOP 20 Delegators loaded:', top20.length);
        } catch (error) {
            console.error('❌ TOP 20 error:', error);
        }
    }

    // ===== HERO VALIDATOR STATUS BADGE =====
    async function updateHeroValidatorStatus() {
        const statusEl = document.getElementById("validatorStatus");
        const perfStatusEl = document.getElementById("validatorPerformanceStatus");
        
        try {
            const url = 'https://swagger.qubetics.com/cosmos/staking/v1beta1/validators/qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn('⚠️ Hero Status API error:', response.status);
                return;
            }
            
            const data = await response.json();
            
            if (data?.validator) {
                const validator = data.validator;
                let statusText = "INACTIVE";
                
                if (validator.status === "BOND_STATUS_BONDED") {
                    statusText = "ACTIVE";
                } else if (validator.jailed) {
                    statusText = "JAILED";
                } else if (validator.status === "BOND_STATUS_UNBONDING") {
                    statusText = "UNBONDING";
                }
                
                // Update both status displays
                if (statusEl) statusEl.textContent = statusText;
                if (perfStatusEl) perfStatusEl.textContent = statusText;
                
                console.log('✅ Hero Validator status:', statusText);
            }
        } catch (error) {
            console.warn('⚠️ Hero Status error:', error.message);
        }
    }

    // ===== BLOCK HEIGHT =====
    let lastBlockHeight = null;
    async function updateBlockHeight() {
        const el = document.getElementById("currentBlock");
        if (!el) return;
        
        try {
            const data = await fetch('https://swagger.qubetics.com/cosmos/base/tendermint/v1beta1/blocks/latest').then(r => r.json());
            
            if (data?.block?.header?.height) {
                const blockHeight = parseInt(data.block.header.height);
                el.textContent = blockHeight.toLocaleString('en-US');
                lastBlockHeight = blockHeight;
                console.log('✅ Block height:', blockHeight);
            }
        } catch (error) {
            console.warn('⚠️ Block height error:', error.message);
        }
    }

    // ===== VOTING POWER =====
    async function updateVotingPower() {
        const powerEl = document.getElementById("delegatedAmountContainer");
        if (!powerEl) return;
        
        try {
            const url = 'https://swagger.qubetics.com/cosmos/staking/v1beta1/validators/qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
            const data = await fetch(url).then(r => r.json());
            
            if (data?.validator?.tokens) {
                const tokens = parseInt(data.validator.tokens) / 1000000000000000000;
                powerEl.textContent = formatNumber(tokens);
                console.log('✅ Voting Power:', tokens);
            }
        } catch (error) {
            console.warn('⚠️ Voting Power error:', error.message);
        }
    }

    // ===== NETWORK SHARE =====
    async function updateNetworkShareData() {
        const networkShareEl = document.getElementById("networkShare");
        const ourStakeEl = document.getElementById("ourStake");
        const networkTotalEl = document.getElementById("networkTotal");
        
        if (!networkShareEl) return;

        try {
            const validatorUrl = 'https://swagger.qubetics.com/cosmos/staking/v1beta1/validators/qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld';
            const poolUrl = 'https://swagger.qubetics.com/cosmos/staking/v1beta1/pool';
            
            const [validatorData, poolData] = await Promise.all([
                fetch(validatorUrl).then(r => r.json()),
                fetch(poolUrl).then(r => r.json())
            ]);
            
            if (validatorData?.validator && poolData?.pool) {
                const ourTokens = parseInt(validatorData.validator.tokens);
                const totalBonded = parseInt(poolData.pool.bonded_tokens);
                
                const ourStake = ourTokens / 1000000000000000000;
                const networkTotal = totalBonded / 1000000000000000000;
                const share = ((ourStake / networkTotal) * 100).toFixed(2);
                
                if (networkShareEl) networkShareEl.textContent = share + '%';
                if (ourStakeEl) ourStakeEl.textContent = formatNumber(ourStake) + ' TICS';
                if (networkTotalEl) networkTotalEl.textContent = formatNumber(networkTotal) + ' TICS';
                
                console.log('✅ Network Share:', share + '%');
            }
        } catch (error) {
            console.warn('⚠️ Network Share error:', error.message);
        }
    }

    // ===== INITIALIZATION =====
    function init() {
        console.log('🚀 Initializing About page v4.1 with Mini Charts...');
        console.log('CORS Proxy enabled:', CONFIG.useCorsProxy);
        
        // Initial fetch
        fetchLatestDelegations();
        updateInfrastructureMetrics();
        updateOutstandingRewards();
        updateValidatorInfo();
        updateSelfBonded();
        updateSigningInfo();
        updateDelegatorsCount();
        updateTop20Delegators();
        updateHeroValidatorStatus();
        updateBlockHeight();
        updateVotingPower();
        updateNetworkShareData();
        
        // Charts
        initNetworkChart();
        initGrowthChart();
        initActivityFeed();
        
        // Regular updates
        setInterval(() => {
            updateInfrastructureMetrics();
        }, CONFIG.updateInterval);
        
        setInterval(fetchLatestDelegations, 30000);
        setInterval(updateOutstandingRewards, 60000);
        setInterval(updateValidatorInfo, 60000);
        setInterval(updateSelfBonded, 60000);
        setInterval(updateSigningInfo, 60000);
        setInterval(updateDelegatorsCount, 300000); // 5 min
        setInterval(updateTop20Delegators, 300000); // 5 min
        setInterval(updateHeroValidatorStatus, 60000); // 1 min
        setInterval(updateBlockHeight, 3000); // 3 sec
        setInterval(updateVotingPower, 60000); // 1 min
        setInterval(updateNetworkShareData, 60000); // 1 min
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
