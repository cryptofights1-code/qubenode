# 🔐 ПОВНА ІНСТРУКЦІЯ: ІНТЕГРАЦІЯ WALLET НА QUBENODE

## 📦 Файли:
1. **wallet-v2.js** - головний скрипт (вже готовий)
2. **index.html** - потрібно оновити (інструкції нижче)

---

## КРОК 1: Додати CosmJS в &lt;head&gt;

Знайти секцію `<head>` і **ПЕРЕД** `</head>` додати:

```html
<!-- CosmJS Library -->
<script src="https://unpkg.com/@cosmjs/stargate@0.32.2/build/index.js"></script>
<script>
  window.cosmos = stargate;
</script>
```

---

## КРОК 2: Додати кнопку "Підключити гаманець" в header

### DESKTOP VERSION:

Знайти блок з контактами `.contact-icons` (приблизно рядок 200-250)

**БУЛО:**
```html
<div class="contact-icons">
    <a href="https://t.me/..." class="contact-icon">
        <span>💬</span>
    </a>
    <a href="mailto:..." class="contact-icon">
        <span>📧</span>
    </a>
</div>
```

**СТАЄ:**
```html
<div class="contact-icons" style="display: flex; align-items: center; gap: 15px;">
    <button id="connectWalletBtn" onclick="connectWallet()" style="padding: 10px 20px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 255, 240, 0.1)); border: 2px solid rgba(0, 212, 255, 0.4); border-radius: 50px; color: #00FFF0; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 8px; white-space: nowrap;">
        <span>🔐 Підключити гаманець</span>
    </button>
    <a href="https://t.me/..." class="contact-icon">
        <span>💬</span>
    </a>
    <a href="mailto:..." class="contact-icon">
        <span>📧</span>
    </a>
</div>
```

### MOBILE VERSION:

Знайти `.fixed-mobile-contacts` (приблизно рядок 180-210)

**ДОДАТИ кнопку:**
```html
<div class="fixed-mobile-contacts" style="display: flex; gap: 12px;">
    <button id="connectWalletBtnMobile" onclick="connectWallet()" style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(0, 255, 240, 0.15)); border: 2px solid rgba(0, 212, 255, 0.5); border-radius: 50%; cursor: pointer;">
        <span style="font-size: 20px;">🔐</span>
    </button>
    <!-- existing contacts -->
</div>
```

---

## КРОК 3: Додати розділ делегування в modal "Як стати делегатором"

Знайти modal `id="delegateModal"` і **ПІСЛЯ** існуючих інструкцій додати:

```html
<!-- NEW: Web Delegation Section -->
<div id="webDelegateSection" style="margin-top: 50px; padding-top: 40px; border-top: 2px solid rgba(0, 212, 255, 0.3);">
    <h3 style="font-size: 2em; margin-bottom: 25px; background: linear-gradient(135deg, #00FFB3, #00D4FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        <span>💻</span> Делегування через сайт
    </h3>

    <p style="font-size: 1.1em; margin-bottom: 30px; color: #cbd5e1;">
        Делегуйте токени безпосередньо через <strong style="color: #00FFF0;">Keplr</strong> або <strong style="color: #00FFF0;">Cosmostation</strong>!
    </p>

    <!-- Steps 1-3 -->
    <div style="margin-bottom: 30px;">
        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #00D4FF, #00FFF0); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #000;">1</div>
            <h4 style="color: #00FFF0; font-size: 1.3em;">Підключіть гаманець</h4>
        </div>
        <p style="color: #cbd5e1; margin-left: 55px;">Натисніть "🔐 Підключити гаманець" вгорі сайту.</p>
    </div>

    <div style="margin-bottom: 30px;">
        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #00D4FF, #00FFF0); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #000;">2</div>
            <h4 style="color: #00FFF0; font-size: 1.3em;">Перегляньте баланс</h4>
        </div>
        <p style="color: #cbd5e1; margin-left: 55px;">Ви побачите свій баланс, делеговані токени та винагороди.</p>
    </div>

    <div style="margin-bottom: 40px;">
        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #00D4FF, #00FFF0); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #000;">3</div>
            <h4 style="color: #00FFF0; font-size: 1.3em;">Делегуйте токени</h4>
        </div>
        <p style="color: #cbd5e1; margin-left: 55px;">Введіть кількість та підтвердіть у гаманці.</p>
    </div>

    <!-- Delegation Form -->
    <div style="background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 240, 0.05)); border: 2px solid rgba(0, 212, 255, 0.3); border-radius: 16px; padding: 30px; margin: 40px 0;">
        <h4 style="color: #00FFF0; text-align: center; margin-bottom: 25px;">💰 Форма делегування</h4>
        
        <!-- Notice (shown when wallet not connected) -->
        <div id="walletNotConnectedNotice" style="text-align: center; padding: 20px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 12px;">
            <p style="color: #ffc107; margin-bottom: 15px;">⚠️ Спочатку підключіть гаманець</p>
            <button onclick="closeModal('delegateModal'); setTimeout(() => connectWallet(), 300);" style="padding: 12px 30px; background: linear-gradient(135deg, #00D4FF, #00FFF0); border: none; border-radius: 50px; color: #000; font-weight: 700; cursor: pointer;">
                🔐 Підключити гаманець
            </button>
        </div>

        <!-- Form (shown when wallet connected) -->
        <div id="delegationForm" style="display: none;">
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <label style="color: rgba(255, 255, 255, 0.8); font-weight: 600;">Кількість TICS:</label>
                    <button onclick="setMaxDelegationAmount()" style="padding: 6px 14px; background: rgba(0, 212, 255, 0.2); border: 1px solid rgba(0, 212, 255, 0.4); border-radius: 8px; color: #00D4FF; font-weight: 600; cursor: pointer;">MAX</button>
                </div>
                <input type="number" id="delegateAmountInput" min="1" step="0.01" placeholder="1000" oninput="updateDelegationPreview()" style="width: 100%; padding: 16px; background: rgba(0, 0, 0, 0.4); border: 2px solid rgba(0, 212, 255, 0.3); border-radius: 12px; color: #fff; font-size: 18px; font-weight: 600;">
                <div style="font-size: 13px; color: rgba(255, 255, 255, 0.5); margin-top: 8px;">
                    Мінімум: <span style="color: #00FFF0;">1,000 TICS</span> для першого делегування
                </div>
            </div>

            <!-- Preview -->
            <div id="delegationPreview" style="display: none; background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin-bottom: 10px; text-transform: uppercase;">📊 Очікувані винагороди:</div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
                    <div style="display: flex; justify-content: space-between;"><span>• Щоденно:</span><span id="previewDaily" style="color: #FFD700; font-weight: 600;">--</span></div>
                    <div style="display: flex; justify-content: space-between;"><span>• Щомісяця:</span><span id="previewMonthly" style="color: #FFD700; font-weight: 600;">--</span></div>
                    <div style="display: flex; justify-content: space-between;"><span>• Щороку:</span><span id="previewYearly" style="color: #FFD700; font-weight: 600;">--</span></div>
                </div>
            </div>

            <!-- Info Box -->
            <div style="background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; gap: 12px;">
                    <span style="font-size: 24px;">ℹ️</span>
                    <div>
                        <div style="color: #00FFF0; font-weight: 700; margin-bottom: 10px;">Інформація:</div>
                        <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8); font-size: 14px; line-height: 1.7;">
                            <li>Комісія: <strong>5%</strong> | APY: <strong>30%</strong> (Ваш: <strong>28.5%</strong>)</li>
                            <li>Винагорода нараховується автоматично</li>
                            <li>Комісія транзакції: ~0.5 TICS</li>
                            <li>Unbonding період: 14 днів</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Submit Button -->
            <button id="delegateSubmitBtn" onclick="delegateTokens()" style="width: 100%; padding: 18px; background: linear-gradient(135deg, #00D4FF, #00FFF0); border: none; border-radius: 12px; color: #000; font-weight: 700; font-size: 17px; cursor: pointer; transition: all 0.3s;">
                Делегувати →
            </button>
        </div>
    </div>

    <div style="background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 12px; padding: 20px; margin-top: 30px;">
        <p style="color: rgba(255, 255, 255, 0.7); margin: 0; font-size: 0.95em;">
            🛡️ <strong style="color: #00FFF0;">Безпека:</strong> Всі транзакції підписуються безпосередньо у вашому гаманці. Приватні ключі ніколи не передаються на сайт.
        </p>
    </div>
</div>
```

---

## КРОК 4: Додати JavaScript для показу/приховування форми

**ПЕРЕД** `</body>` додати:

```html
<script>
// Show/hide delegation form based on wallet connection
function updateDelegationFormVisibility() {
    const notice = document.getElementById('walletNotConnectedNotice');
    const form = document.getElementById('delegationForm');
    
    if (!notice || !form) return;
    
    // Check if wallet is connected (check global variable from wallet-v2.js)
    if (window.walletConnected) {
        notice.style.display = 'none';
        form.style.display = 'block';
    } else {
        notice.style.display = 'block';
        form.style.display = 'none';
    }
}

// Call this when modal opens
const originalOpenModal = window.openModal;
window.openModal = function(modalId) {
    if (typeof originalOpenModal === 'function') {
        originalOpenModal(modalId);
    }
    if (modalId === 'delegateModal') {
        setTimeout(updateDelegationFormVisibility, 100);
    }
};

// Update when wallet connects/disconnects
window.addEventListener('walletConnectionChange', updateDelegationFormVisibility);
</script>
```

---

## КРОК 5: Підключити wallet-v2.js

**ПЕРЕД** `</body>` (після sync.js) додати:

```html
<!-- Wallet Integration v2.0 -->
<script src="wallet-v2.js?v=2.0"></script>
```

---

## КРОК 6: Додати CSS для wallet dropdown (optional styling)

В секції `<style>` додати:

```css
/* Wallet Button Hover Effects */
#connectWalletBtn:hover {
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(0, 255, 240, 0.15)) !important;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 212, 255, 0.3);
}

#connectWalletBtn:active {
    transform: translateY(0);
}

/* Mobile Wallet Button */
@media (max-width: 768px) {
    #connectWalletBtn {
        font-size: 12px !important;
        padding: 8px 16px !important;
    }
    
    #connectWalletBtnMobile {
        display: flex !important;
    }
}
```

---

## ✅ ГОТОВО!

Після всіх змін структура має бути:

```
📁 /mnt/user-data/outputs/
├── index.html (оновлений)
├── sync.js (без змін)
└── wallet-v2.js (новий файл)
```

---

## 🧪 ТЕСТУВАННЯ:

1. Відкрити сайт
2. Натиснути "🔐 Підключити гаманець"
3. Обрати Keplr або Cosmostation
4. Підтвердити додавання Qubetics
5. Побачити dropdown з балансом
6. Відкрити modal "Як стати делегатором"
7. Прокрутити до розділу "Делегування через сайт"
8. Ввести суму → Делегувати
9. Підтвердити в гаманці
10. Перевірити транзакцію на TicsScan Native

---

## 📞 Потрібна допомога?

- Telegram: @qubenode
- GitHub Issues: [створити issue]

**Успіхів! 🚀**
