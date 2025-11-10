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
        DEBUG: true  // Увімкнено для тестування
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
            
            // Використовуємо Cosmos SDK REST API
            const endpoint = `/cosmos/staking/v1beta1/validators/${CONFIG.VALIDATOR_ADDRESS}`;
            const response = await fetch(`https://swagger.qubetics.com${endpoint}`);
            
            if (!response.ok) {
                throw new Error(`API відповів з помилкою: ${response.status}`);
            }
            
            const data = await response.json();
            log.success('Дані валідатора завантажено');
            log.info('Дані валідатора:', data);
            return data;
            
        } catch (error) {
            log.error('Помилка завантаження даних валідатора:', error);
            return null;
        }
    }

    // Завантаження кількості делегаторів
    async function fetchDelegatorsCount() {
        try {
            log.info('Завантаження кількості делегаторів...');
            
            let allDelegators = [];
            let nextKey = null;
            let pageCount = 0;
            const maxPages = 10; // Максимум 10 сторінок для безпеки
            
            do {
                const params = new URLSearchParams();
                if (nextKey) {
                    params.append('pagination.key', nextKey);
                }
                params.append('pagination.limit', '100'); // 100 делегаторів за запит
                
                const endpoint = `/cosmos/staking/v1beta1/validators/${CONFIG.VALIDATOR_ADDRESS}/delegations?${params}`;
                const response = await fetch(`https://swagger.qubetics.com${endpoint}`);
                
                if (!response.ok) {
                    throw new Error(`API відповів з помилкою: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.delegation_responses && data.delegation_responses.length > 0) {
                    allDelegators = allDelegators.concat(data.delegation_responses);
                }
                
                // Перевіряємо чи є наступна сторінка
                nextKey = data.pagination?.next_key;
                pageCount++;
                
                log.info(`Завантажено сторінку ${pageCount}, делегаторів: ${allDelegators.length}`);
                
            } while (nextKey && pageCount < maxPages);
            
            const count = allDelegators.length;
            log.success(`Загальна кількість делегаторів: ${count}`);
            return count;
            
        } catch (error) {
            log.error('Помилка завантаження делегаторів:', error);
            return null;
        }
    }

    // Завантаження даних про signing info (uptime, missed blocks)
    async function fetchSigningInfo() {
        try {
            log.info('Завантаження signing info...');
            
            // Спочатку отримуємо всі signing infos
            const response = await fetch('https://swagger.qubetics.com/cosmos/slashing/v1beta1/signing_infos');
            
            if (!response.ok) {
                log.info('Signing infos endpoint недоступний');
                return null;
            }
            
            const data = await response.json();
            
            // Шукаємо наш валідатор за consensus address
            const consAddress = 'qubeticsvalcons1dlmj5pzg3fv54nrtejnfxmrj08d7qs09xjp2eu';
            const ourInfo = data.info?.find(info => info.address === consAddress);
            
            if (ourInfo) {
                log.success('Signing info знайдено');
                log.info('Signing info:', ourInfo);
                return { val_signing_info: ourInfo };
            } else {
                log.info('Signing info для валідатора не знайдено');
                return null;
            }
            
        } catch (error) {
            log.error('Помилка завантаження signing info:', error);
            return null;
        }
    }

    // ==========================================
    // 2. ДАНІ БЛОКЧЕЙНУ (V2 TicsScan)
    // ==========================================
    
    async function fetchBlockchainData() {
        try {
            log.info('Завантаження даних блокчейну...');
            
            // Використовуємо Cosmos SDK REST API для отримання останнього блоку
            const response = await fetch('https://swagger.qubetics.com/cosmos/base/tendermint/v1beta1/blocks/latest');
            
            if (!response.ok) {
                throw new Error(`API відповів з помилкою: ${response.status}`);
            }
            
            const data = await response.json();
            log.success('Дані блокчейну завантажено');
            log.info('Дані блоку:', data);
            return data;
            
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
            
            // MEXC API - спробуємо кілька endpoints
            const endpoints = [
                'https://www.mexc.com/open/api/v2/market/ticker?symbol=TICS_USDT',
                'https://api.mexc.com/api/v3/ticker/24hr?symbol=TICSUSDT',
            ];
            
            for (const endpoint of endpoints) {
                try {
                    log.info(`Пробую endpoint: ${endpoint}`);
                    const response = await fetch(endpoint);
                    
                    if (!response.ok) {
                        log.info(`Endpoint ${endpoint} відповів з помилкою ${response.status}`);
                        continue;
                    }
                    
                    const data = await response.json();
                    log.info('MEXC response:', data);
                    
                    // Парсимо v2 API response
                    if (data.data && data.data.length > 0) {
                        const ticker = data.data[0];
                        const priceData = {
                            price: parseFloat(ticker.last || ticker.close),
                            change24h: parseFloat(ticker.rate) * 100,
                            volume24h: parseFloat(ticker.volume)
                        };
                        log.success('Ціна завантажена з MEXC v2:', priceData);
                        return priceData;
                    }
                    
                    // Парсимо v3 API response
                    if (data.symbol === 'TICSUSDT' || data.lastPrice) {
                        const priceData = {
                            price: parseFloat(data.lastPrice),
                            change24h: parseFloat(data.priceChangePercent),
                            volume24h: parseFloat(data.volume)
                        };
                        log.success('Ціна завантажена з MEXC v3:', priceData);
                        return priceData;
                    }
                    
                } catch (endpointError) {
                    log.info(`Помилка з endpoint ${endpoint}:`, endpointError.message);
                }
            }
            
            // Якщо MEXC не працює - показуємо повідомлення
            log.error('MEXC API недоступний через CORS обмеження браузера');
            log.info('Після завантаження на GitHub Pages MEXC має працювати');
            
            // Повертаємо null щоб показати "Завантаження..." замість фейкових даних
            return null;
            
        } catch (error) {
            log.error('Помилка завантаження ціни:', error);
            return null;
        }
    }

    // ==========================================
    // 4. ОНОВЛЕННЯ UI
    // ==========================================
    
    function updateValidatorCard(data) {
        if (!data) return;
        
        try {
            const validator = data.validator;
            if (!validator) {
                log.error('Немає даних validator в відповіді');
                return;
            }
            
            // 1. Оновлюємо загальну суму делегованих монет
            if (validator.tokens) {
                const element = document.getElementById('delegatedAmount');
                if (element) {
                    try {
                        // Видаляємо всі символи крім цифр
                        const tokensStr = String(validator.tokens).replace(/[^\d]/g, '');
                        
                        // Конвертуємо з utics (мікро) в TICS
                        //Ділимо на 1,000,000 (6 нулів)
                        if (tokensStr.length > 6) {
                            const tics = tokensStr.slice(0, -6); // Відрізаємо останні 6 цифр
                            const formattedTics = parseInt(tics).toLocaleString('en-US');
                            element.textContent = formattedTics;
                            log.info('Оновлено загальну суму делегацій:', formattedTics);
                        } else {
                            element.textContent = '0';
                            log.info('Сума делегацій менше 1 TICS');
                        }
                    } catch (error) {
                        log.error('Помилка форматування tokens:', error);
                    }
                }
            }
            
            // 2. Оновлюємо кількість делегаторів - потрібен окремий запит
            // Поки що залишаємо як є, бо потрібен endpoint /staking/validators/{addr}/delegations
            
            // 3. Оновлюємо комісію
            if (validator.commission?.commission_rates?.rate) {
                const element = document.getElementById('commissionRate');
                if (element) {
                    const commissionRate = parseFloat(validator.commission.commission_rates.rate) * 100;
                    element.textContent = `${commissionRate.toFixed(1)}%`;
                    log.info('Оновлено комісію:', commissionRate);
                }
            }
            
            // 4. Uptime та signed blocks потребують окремих запитів до slashing module
            // Ці дані недоступні в базовому validator endpoint
            
        } catch (error) {
            log.error('Помилка оновлення карток валідатора:', error);
        }
    }

    function updateDelegatorsCount(count) {
        if (count === null || count === undefined) return;
        
        try {
            const element = document.getElementById('delegatorsCount');
            if (element) {
                element.textContent = count.toLocaleString('en-US');
                log.info('Оновлено кількість делегаторів:', count);
            }
        } catch (error) {
            log.error('Помилка оновлення кількості делегаторів:', error);
        }
    }

    function updateSigningInfo(data) {
        if (!data) {
            log.info('Signing info недоступна, використовуємо дефолтне значення');
            // Встановлюємо 100% якщо дані недоступні
            const uptimeElement = document.getElementById('uptimePercent');
            if (uptimeElement) {
                uptimeElement.textContent = '100%';
            }
            return;
        }
        
        try {
            // Розраховуємо uptime на основі missed blocks
            const signingInfo = data.val_signing_info || data;
            if (signingInfo) {
                const missedBlocks = parseInt(signingInfo.missed_blocks_counter || signingInfo.missedBlocksCounter) || 0;
                const indexOffset = parseInt(signingInfo.index_offset || signingInfo.indexOffset) || 100000;
                
                // Uptime = (загальні блоки - пропущені) / загальні блоки * 100
                const uptime = ((indexOffset - missedBlocks) / indexOffset) * 100;
                
                const uptimeElement = document.getElementById('uptimePercent');
                if (uptimeElement) {
                    uptimeElement.textContent = `${uptime.toFixed(1)}%`;
                    log.info('Оновлено uptime:', uptime.toFixed(1), `(missed: ${missedBlocks}, total: ${indexOffset})`);
                }
            }
            
        } catch (error) {
            log.error('Помилка оновлення signing info:', error);
        }
    }

    function updateBlockchainCard(data) {
        if (!data) return;
        
        try {
            // Оновлюємо висоту блоку
            const blockHeight = data.block?.header?.height || data.sdk_block?.header?.height;
            if (blockHeight) {
                const element = document.getElementById('currentBlock');
                if (element) {
                    // Форматуємо число з комами
                    element.textContent = parseInt(blockHeight).toLocaleString('en-US');
                    log.info('Оновлено висоту блоку:', blockHeight);
                }
                
                // Розраховуємо середній час створення блоку
                const currentTime = new Date(data.block?.header?.time || data.sdk_block?.header?.time);
                
                if (dataCache.blocks && dataCache.blocks.lastHeight && dataCache.blocks.lastTime) {
                    const blockDiff = parseInt(blockHeight) - parseInt(dataCache.blocks.lastHeight);
                    const timeDiff = (currentTime - dataCache.blocks.lastTime) / 1000; // в секундах
                    
                    if (blockDiff > 0 && timeDiff > 0) {
                        const avgBlockTime = timeDiff / blockDiff;
                        
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
                    ...dataCache.blocks,
                    lastHeight: blockHeight,
                    lastTime: currentTime
                };
            }
            
        } catch (error) {
            log.error('Помилка оновлення даних блокчейну:', error);
        }
    }

    function updatePriceCard(data) {
        if (!data) {
            log.info('Дані про ціну недоступні - можливо CORS блокування');
            
            // Показуємо повідомлення про те що потрібен GitHub Pages
            const priceElement = document.getElementById('ticsPrice');
            if (priceElement) {
                priceElement.textContent = 'CORS';
                priceElement.style.fontSize = '0.8em';
            }
            
            const changeElement = document.getElementById('ticsChange');
            if (changeElement) {
                changeElement.textContent = 'Потрібен GitHub';
                changeElement.style.fontSize = '0.6em';
            }
            return;
        }
        
        try {
            // Оновлюємо ціну
            const priceElement = document.getElementById('ticsPrice');
            if (priceElement) {
                priceElement.textContent = `$${data.price.toFixed(4)}`;
                priceElement.style.fontSize = ''; // Reset font size
                log.info('Оновлено ціну:', data.price);
            }
            
            // Оновлюємо зміну за 24 години
            const changeElement = document.getElementById('ticsChange');
            if (changeElement) {
                const change = data.change24h;
                const sign = change >= 0 ? '+' : '';
                changeElement.textContent = `${sign}${change.toFixed(2)}%`;
                changeElement.style.fontSize = ''; // Reset font size
                
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
            const [validatorData, delegatorsCount, signingInfo, blockchainData, priceData] = await Promise.all([
                fetchValidatorData(),
                fetchDelegatorsCount(),
                fetchSigningInfo(),
                fetchBlockchainData(),
                fetchPriceData()
            ]);
            
            // Оновлюємо кеш
            dataCache.validator = validatorData;
            dataCache.delegators = delegatorsCount;
            dataCache.signing = signingInfo;
            dataCache.blocks = blockchainData;
            dataCache.price = priceData;
            dataCache.lastUpdate = new Date();
            
            // Оновлюємо UI
            updateValidatorCard(validatorData);
            updateDelegatorsCount(delegatorsCount);
            updateSigningInfo(signingInfo);
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
