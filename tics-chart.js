/**
 * TICS Price Chart - Lightweight Charts Implementation
 * Replaces TradingView widget for better CSP compliance
 * QubeNode Validator - qubenode.space
 */

(function() {
    'use strict';
    
    // Chart configuration
    const CONFIG = {
        symbol: 'TICSUSDT',
        exchange: 'MEXC',
        intervals: {
            '1m': '1m',
            '5m': '5m', 
            '15m': '15m',
            '1h': '1h',
            '4h': '4h',
            '1D': '1d'
        },
        colors: {
            background: '#0a0e1a',
            text: '#00D4FF',
            textSecondary: '#94a3b8',
            grid: 'rgba(0, 212, 255, 0.1)',
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444'
        }
    };

    let chart = null;
    let candlestickSeries = null;
    let volumeSeries = null;
    let currentInterval = '4h';
    let priceData = [];
    let volumeData = [];

    /**
     * Initialize chart on page load
     */
    function initChart() {
        console.log('🚀 Initializing TICS Price Chart...');
        
        const container = document.getElementById('tics-chart');
        if (!container) {
            console.error('❌ Chart container not found');
            return;
        }

        // Create chart
        chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: 500,
            layout: {
                background: { 
                    type: 'solid',
                    color: CONFIG.colors.background
                },
                textColor: CONFIG.colors.text,
            },
            grid: {
                vertLines: { 
                    color: CONFIG.colors.grid,
                    style: 1,
                },
                horzLines: { 
                    color: CONFIG.colors.grid,
                    style: 1,
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    color: 'rgba(0, 212, 255, 0.5)',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: CONFIG.colors.text,
                },
                horzLine: {
                    color: 'rgba(0, 212, 255, 0.5)',
                    width: 1,
                    style: 3,
                    labelBackgroundColor: CONFIG.colors.text,
                },
            },
            rightPriceScale: {
                borderColor: CONFIG.colors.grid,
                textColor: CONFIG.colors.textSecondary,
            },
            timeScale: {
                borderColor: CONFIG.colors.grid,
                textColor: CONFIG.colors.textSecondary,
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Add candlestick series
        candlestickSeries = chart.addCandlestickSeries({
            upColor: CONFIG.colors.upColor,
            downColor: CONFIG.colors.downColor,
            borderUpColor: CONFIG.colors.borderUpColor,
            borderDownColor: CONFIG.colors.borderDownColor,
            wickUpColor: CONFIG.colors.wickUpColor,
            wickDownColor: CONFIG.colors.wickDownColor,
        });

        // Add volume series
        volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        // Make chart responsive
        window.addEventListener('resize', handleResize);
        
        // Load initial data
        loadChartData(currentInterval);
        
        // Setup interval buttons
        setupIntervalButtons();
        
        console.log('✅ Chart initialized');
    }

    /**
     * Setup interval switching buttons
     */
    function setupIntervalButtons() {
        const buttons = document.querySelectorAll('.chart-interval-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const interval = btn.dataset.interval;
                if (interval && interval !== currentInterval) {
                    switchInterval(interval);
                }
            });
        });
    }

    /**
     * Switch chart interval
     */
    function switchInterval(interval) {
        console.log(`📊 Switching to ${interval}`);
        
        // Update active button
        document.querySelectorAll('.chart-interval-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-interval="${interval}"]`).classList.add('active');
        
        // Update interval and reload data
        currentInterval = interval;
        loadChartData(interval);
    }

    /**
     * Load chart data from MEXC API
     */
    async function loadChartData(interval) {
        try {
            console.log(`📡 Loading ${interval} data...`);
            
            // Show loading state
            showLoading();
            
            // Fetch from MEXC API
            const data = await fetchMEXCData(interval);
            
            if (data && data.length > 0) {
                updateChart(data);
                console.log(`✅ Loaded ${data.length} candles`);
            } else {
                console.warn('⚠️ No data received');
                showError('No data available');
            }
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            showError('Failed to load chart data');
        } finally {
            hideLoading();
        }
    }

    /**
     * Fetch data from MEXC API
     */
    async function fetchMEXCData(interval) {
        const intervalMap = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '1h': '60m',
            '4h': '4h',
            '1D': '1d'
        };
        
        const mexcInterval = intervalMap[interval] || '4h';
        const limit = 500; // Last 500 candles
        
        // MEXC Klines API
        const url = `https://api.mexc.com/api/v3/klines?symbol=TICSUSDT&interval=${mexcInterval}&limit=${limit}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const klines = await response.json();
            
            // Transform MEXC data to Lightweight Charts format
            return klines.map(k => ({
                time: Math.floor(k[0] / 1000), // Convert ms to seconds
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
            }));
            
        } catch (error) {
            console.error('MEXC API Error:', error);
            return null;
        }
    }

    /**
     * Update chart with new data
     */
    function updateChart(data) {
        if (!candlestickSeries || !volumeSeries || !data) return;
        
        // Prepare candlestick data
        priceData = data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        }));
        
        // Prepare volume data with colors
        volumeData = data.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 
                'rgba(34, 197, 94, 0.5)' :  // Green
                'rgba(239, 68, 68, 0.5)'     // Red
        }));
        
        // Update series
        candlestickSeries.setData(priceData);
        volumeSeries.setData(volumeData);
        
        // Fit content
        chart.timeScale().fitContent();
    }

    /**
     * Handle window resize
     */
    function handleResize() {
        const container = document.getElementById('tics-chart');
        if (chart && container) {
            chart.applyOptions({ 
                width: container.clientWidth 
            });
        }
    }

    /**
     * Show loading indicator
     */
    function showLoading() {
        const container = document.getElementById('tics-chart');
        if (container) {
            container.classList.add('loading');
        }
    }

    /**
     * Hide loading indicator
     */
    function hideLoading() {
        const container = document.getElementById('tics-chart');
        if (container) {
            container.classList.remove('loading');
        }
    }

    /**
     * Show error message
     */
    function showError(message) {
        const container = document.getElementById('tics-chart');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'chart-error';
            errorDiv.textContent = message;
            container.appendChild(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }

    /**
     * Auto-refresh chart data every 60 seconds
     */
    function startAutoRefresh() {
        setInterval(() => {
            console.log('🔄 Auto-refreshing chart...');
            loadChartData(currentInterval);
        }, 60000); // 60 seconds
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initChart();
            startAutoRefresh();
        });
    } else {
        initChart();
        startAutoRefresh();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (chart) {
            chart.remove();
        }
    });

})();
