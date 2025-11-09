// sync.js - Синхронізація даних QubeNode з API
// Автоматичне оновлення даних кожні 30 секунд

(function() {
    'use strict';

    // Конфігурація
    const CONFIG = {
        // Адреса валідатора QubeNode
        VALIDATOR_ADDRESS: 'qubeticsvaloper1tzk9f84cv2gmk3du3m9dpxcuph70sfj6uf6kld',
        
        // API endpoints
        APIS: {
            // Native TicsScan API (Swagger)
            NATIVE_API: 'https://swagger.qubetics.com',
            // V2 TicsScan API
            V2_API: 'https://v2.ticsscan.com',
            // MEXC API
            MEXC_API: 'https://www.mexc.com/open/api/v2'
        },
        
        // Інтервал оновлення (30 секунд)
        UPDATE_INTERVAL: 30000,
        
        // Налагодження
        DEBUG: false
    };

    // Утиліти для логування
    const log = {
        info: (msg, data) => CONFIG.DEBUG && console.log(`[QubeNode] ${msg}`, data || ''),
        error: (msg, error) => console.error(`[QubeNode ERROR] ${msg}`, error),
        success: (msg) => CONFIG.DEBUG && console.log(`[QubeNode ✓] ${msg}`)
    };

    // Кеш даних
    let dataCache = {
        validator: null,
        blocks: null,
        price: null,
        lastUpdate: null
    };

    // ==========================================
    // 1. ДАНІ ВАЛІДАТОРА (Native TicsScan)
    // ==========================================
    
    async function fetchValidatorData() {
        try {
            log.info('Завантаження даних валідатора...');
            
            // Спробуємо різні можливі endpoints
            const endpoints = [
                `/cosmos/staking/v1beta1/validators/${CONFIG.VALIDATOR_ADDRESS}`,
                `/staking/validators/${CONFIG.VALIDATOR_ADDRESS}`,
                `/api/v1/validators/${CONFIG.VALIDATOR_ADDRESS}`
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${CONFIG.APIS.NATIVE_API}${endpoint}`);
                    if (response.ok) {
                        const data = await response.json();
                        log.success('Дані валідатора завантажено');
                        return data;
                    }
                } catch (e) {
                    log.info(`Endpoint ${endpoint} не працює, пробуємо наступний...`);
                }
            }
            
            throw new Error('Не вдалося завантажити дані валідатора');
            
        } catch (error) {
            log.error('Помилка завантаження даних валідатора:', error);
            return null;
        }
    }

    // ==========================================
    // 2. ДАНІ БЛОКЧЕЙНУ (V2 TicsScan)
    // ==========================================
    
    async function fetchBlockchainData() {
        try {
            log.info('Завантаження даних блокчейну...');
            
            // Спробуємо різні можливі endpoints
            const endpoints = [
                '/api/blocks/latest',
                '/cosmos/base/tendermint/v1beta1/blocks/latest',
                '/blocks/latest'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${CONFIG.APIS.V2_API}${endpoint}`);
                    if (response.ok) {
                        const data = await response.json();
                        log.success('Дані блокчейну завантажено');
                        return data;
                    }
                } catch (e) {
                    log.info(`Endpoint ${endpoint} не працює, пробуємо наступний...`);
                }
            }
            
            throw new Error('Не вдалося завантажити дані блокчейну');
            
        } catch (error) {
            log.error('Помилка завантаження даних блокчейну:', error);
            return null;
        }
    }

    // ==========================================
    // 3. ЦІНА ТОКЕНА (MEXC)
    // ==========================================
    
    async function fetchPriceData() {
        try {
            log.info('Завантаження ціни з MEXC...');
            
            // MEXC API для отримання ціни TICS/USDT
            const symbol = 'TICS_USDT';
            const response = await fetch(`${CONFIG.APIS.MEXC_API}/market/ticker?symbol=${symbol}`);
            
            if (!response.ok) {
                throw new Error(`MEXC API відповів з помилкою: ${response.status}`);
            }
            
            const data = await response.json();
            log.success('Ціна завантажена з MEXC');
            
            return {
                price: parseFloat(data.data[0].last),
                change24h: parseFloat(data.data[0].rate),
                volume24h: parseFloat(data.data[0].volume)
            };
            
        } catch (error) {
            log.error('Помилка завантаження ціни з MEXC:', error);
            return null;
        }
    }

    // ==========================================
    // 4. ОНОВЛЕННЯ UI
    // ==========================================
    
    function updateValidatorCard(data) {
        if (!data) return;
        
        try {
            // Оновлюємо загальну суму делегованих монет
            const totalDelegated = data.validator?.tokens || data.tokens;
            if (totalDelegated) {
                const element = document.getElementById('delegatedAmount');
                if (element) {
                    const formatted = formatNumber(totalDelegated / 1e6); // Конвертуємо з utics в tics
                    element.textContent = formatted;
                    log.info('Оновлено загальну суму делегацій:', formatted);
                }
            }
            
            // Оновлюємо кількість делегаторів
            const delegatorCount = data.validator?.delegator_shares || data.delegator_shares;
            if (delegatorCount) {
                const element = document.getElementById('delegatorsCount');
                if (element) {
                    element.textContent = Math.floor(delegatorCount);
                    log.info('Оновлено кількість делегаторів');
                }
            }
            
            // Оновлюємо комісію
            const commission = data.validator?.commission?.commission_rates?.rate || data.commission?.commission_rates?.rate;
            if (commission) {
                const element = document.getElementById('commissionRate');
                if (element) {
                    element.textContent = `${(parseFloat(commission) * 100).toFixed(1)}%`;
                    log.info('Оновлено комісію');
                }
            }
            
            // Оновлюємо uptime (якщо є дані)
            const uptime = data.validator?.uptime || 99.9;
            const uptimeElement = document.getElementById('uptimePercent');
            if (uptimeElement) {
                uptimeElement.textContent = `${uptime.toFixed(1)}%`;
                log.info('Оновлено uptime');
            }
            
            // Оновлюємо кількість валідованих блоків
            const signedBlocks = data.validator?.signed_blocks || 0;
            const signedBlocksElement = document.getElementById('signedBlocks');
            if (signedBlocksElement && signedBlocks) {
                signedBlocksElement.textContent = formatNumber(signedBlocks);
                log.info('Оновлено кількість валідованих блоків');
            }
            
        } catch (error) {
            log.error('Помилка оновлення карток валідатора:', error);
        }
    }

    function updateBlockchainCard(data) {
        if (!data) return;
        
        try {
            // Оновлюємо висоту блоку
            const blockHeight = data.block?.header?.height || data.height;
            if (blockHeight) {
                const element = document.getElementById('currentBlock');
                if (element) {
                    // Форматуємо число з комами
                    element.textContent = parseInt(blockHeight).toLocaleString('en-US');
                    log.info('Оновлено висоту блоку:', blockHeight);
                }
            }
            
            // Розраховуємо середній час створення блоку
            // Зберігаємо попередній блок для розрахунку
            if (dataCache.blocks && dataCache.blocks.blockHeight && blockHeight) {
                const blockDiff = blockHeight - dataCache.blocks.blockHeight;
                const timeDiff = Date.now() - dataCache.blocks.timestamp;
                
                if (blockDiff > 0 && timeDiff > 0) {
                    const avgBlockTime = (timeDiff / 1000) / blockDiff; // секунди на блок
                    
                    // Оновлюємо час блоку в badge
                    const blockInfoElement = document.querySelector('.block-info');
                    if (blockInfoElement) {
                        blockInfoElement.innerHTML = `Блок #<span id="currentBlock">${parseInt(blockHeight).toLocaleString('en-US')}</span> • ~${avgBlockTime.toFixed(2)}с`;
                        log.info('Оновлено середній час блоку:', avgBlockTime.toFixed(2));
                    }
                }
            }
            
            // Зберігаємо поточні дані для наступного розрахунку
            dataCache.blocks = {
                blockHeight: blockHeight,
                timestamp: Date.now()
            };
            
        } catch (error) {
            log.error('Помилка оновлення даних блокчейну:', error);
        }
    }

    function updatePriceCard(data) {
        if (!data) return;
        
        try {
            // Оновлюємо ціну
            const priceElement = document.getElementById('ticsPrice');
            if (priceElement) {
                priceElement.textContent = `$${data.price.toFixed(4)}`;
                log.info('Оновлено ціну:', data.price);
            }
            
            // Оновлюємо зміну за 24 години
            const changeElement = document.getElementById('ticsChange');
            if (changeElement) {
                const change = data.change24h;
                const sign = change >= 0 ? '+' : '';
                changeElement.textContent = `${sign}${change.toFixed(2)}%`;
                
                // Змінюємо колір елемента-батька (stat-value)
                const statValueElement = changeElement.closest('.stat-value');
                if (statValueElement) {
                    statValueElement.style.color = change >= 0 ? '#22c55e' : '#ef4444';
                }
                
                log.info('Оновлено зміну ціни:', change);
            }
            
            // Оновлюємо об'єм торгів (якщо є елемент)
            const volumeElement = document.getElementById('ticsVolume');
            if (volumeElement && data.volume24h) {
                volumeElement.textContent = `$${formatNumber(data.volume24h)}`;
                log.info('Оновлено об\'єм торгів');
            }
            
        } catch (error) {
            log.error('Помилка оновлення даних ціни:', error);
        }
    }

    // ==========================================
    // 5. ГОЛОВНА ФУНКЦІЯ СИНХРОНІЗАЦІЇ
    // ==========================================
    
    async function syncAllData() {
        log.info('=== Початок синхронізації даних ===');
        
        try {
            // Завантажуємо всі дані паралельно
            const [validatorData, blockchainData, priceData] = await Promise.all([
                fetchValidatorData(),
                fetchBlockchainData(),
                fetchPriceData()
            ]);
            
            // Оновлюємо кеш
            dataCache.validator = validatorData;
            dataCache.blocks = blockchainData;
            dataCache.price = priceData;
            dataCache.lastUpdate = new Date();
            
            // Оновлюємо UI
            updateValidatorCard(validatorData);
            updateBlockchainCard(blockchainData);
            updatePriceCard(priceData);
            
            log.success('=== Синхронізація завершена успішно ===');
            
            // Оновлюємо індикатор останнього оновлення
            updateLastSyncIndicator();
            
        } catch (error) {
            log.error('Помилка під час синхронізації:', error);
        }
    }

    function updateLastSyncIndicator() {
        // Можна додати індикатор в майбутньому
        if (CONFIG.DEBUG) {
            console.log('Останнє оновлення:', dataCache.lastUpdate?.toLocaleTimeString('uk-UA'));
        }
    }

    // ==========================================
    // 6. ДОПОМІЖНІ ФУНКЦІЇ
    // ==========================================
    
    function formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    // ==========================================
    // 7. ІНІЦІАЛІЗАЦІЯ
    // ==========================================
    
    function init() {
        log.info('Ініціалізація QubeNode sync.js');
        
        // Перша синхронізація одразу після завантаження
        syncAllData();
        
        // Автоматичне оновлення кожні 30 секунд
        setInterval(syncAllData, CONFIG.UPDATE_INTERVAL);
        
        log.success(`Автоматичне оновлення увімкнено (кожні ${CONFIG.UPDATE_INTERVAL / 1000}s)`);
    }

    // Чекаємо повного завантаження DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
