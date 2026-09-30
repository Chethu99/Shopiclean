/**
 * ShopiClean License & Payment Gate Controller
 * 100% Client-side, zero backend dependencies.
 */

const SHOPICLEAN_CONFIG = {
  storageKey: 'shopiclean_license_key',
  // Replace with your real Lemon Squeezy overlay URL once registered:
  checkoutUrl: 'https://yourstore.lemonsqueezy.com/buy/YOUR-VARIANT-ID?embed=1',
  validationEndpoint: 'https://api.lemonsqueezy.com/v1/licenses/validate',
  // Dev / Testing bypass key (works without Lemon Squeezy setup)
  testBypassKey: 'TEST-PASS-1234'
};

// 1. Check if an active license exists locally
function hasActiveLicense() {
  const key = localStorage.getItem(SHOPICLEAN_CONFIG.storageKey);
  return typeof key === 'string' && key.trim().length > 0;
}

// 2. Persist license key to browser
function saveLicense(key) {
  if (key && key.trim()) {
    localStorage.setItem(SHOPICLEAN_CONFIG.storageKey, key.trim());
  }
}

// 3. Clear license key (useful for manual testing)
function clearSavedLicense() {
  localStorage.removeItem(SHOPICLEAN_CONFIG.storageKey);
}

// 4. Validate license key via Dev Bypass or Lemon Squeezy Public API
async function verifyLemonLicense(key) {
  const cleanKey = (key || '').trim();
  if (!cleanKey) return false;

  // DEV / TEST BYPASS: Allows full verification testing without an active Lemon Squeezy account
  if (cleanKey === SHOPICLEAN_CONFIG.testBypassKey) {
    return true;
  }

  try {
    const response = await fetch(SHOPICLEAN_CONFIG.validationEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ license_key: cleanKey })
    });

    const data = await response.json();
    return data && data.valid === true;
  } catch (err) {
    console.error('License verification request failed:', err);
    return false;
  }
}

// 5. Open Paywall Modal and capture export callback
function openPaywallModal(onSuccessCallback) {
  let modal = document.getElementById('shopiclean-paywall-modal');
  if (!modal) {
    injectPaywallModal();
    modal = document.getElementById('shopiclean-paywall-modal');
  }

  window._shopicleanPaymentSuccessCallback = onSuccessCallback;
  modal.classList.remove('hidden');
}

// 6. Close Paywall Modal
function closePaywallModal() {
  const modal = document.getElementById('shopiclean-paywall-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 7. Toggle manual key entry box
function toggleKeyRestore() {
  const box = document.getElementById('license-restore-box');
  if (box) {
    box.classList.toggle('hidden');
  }
}

// 8. Handle manual key validation submit
async function handleManualKeySubmit() {
  const input = document.getElementById('manual-license-input');
  const feedback = document.getElementById('license-feedback');
  const key = input ? input.value.trim() : '';

  if (!key) return;

  feedback.classList.remove('hidden', 'text-red-500', 'text-emerald-600');
  feedback.classList.add('text-slate-500');
  feedback.textContent = 'Verifying key...';

  const isValid = await verifyLemonLicense(key);

  if (isValid) {
    saveLicense(key);
    feedback.classList.remove('text-slate-500');
    feedback.classList.add('text-emerald-600');
    feedback.textContent = 'License activated! Starting export...';
    setTimeout(() => {
      closePaywallModal();
      if (typeof window._shopicleanPaymentSuccessCallback === 'function') {
        window._shopicleanPaymentSuccessCallback();
      }
    }, 700);
  } else {
    feedback.classList.remove('text-slate-500');
    feedback.classList.add('text-red-500');
    feedback.textContent = 'Invalid or expired key. Please check your order receipt.';
  }
}

// 9. Inject Modal Markup into DOM
function injectPaywallModal() {
  const modalHtml = `
    <div id="shopiclean-paywall-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 text-slate-800">
        
        <!-- Close Button -->
        <button type="button" onclick="closePaywallModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none">&times;</button>
        
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-3 text-2xl">
            ✓
          </div>
          <h3 class="text-xl font-bold text-slate-900">Your File Is Cleaned & Ready</h3>
          <p class="text-sm text-slate-500 mt-1">Unlock instant exports and fixes across all 4 utilities.</p>
        </div>

        <!-- Offer Card -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
          <div class="flex justify-between items-baseline mb-1">
            <span class="font-semibold text-slate-900 text-base">7-Day Launch Pass</span>
            <span class="text-2xl font-black text-slate-900">$9</span>
          </div>
          <p class="text-xs text-slate-500 mb-3">One-time payment • No auto-renewal • Unlimited file downloads</p>
          <ul class="text-xs text-slate-600 space-y-1.5 mb-4">
            <li class="flex items-center">✓ 100% in-browser client privacy (zero server uploads)</li>
            <li class="flex items-center">✓ Unlimited CSV exports across all 4 tools</li>
            <li class="flex items-center">✓ 14-day technical money-back guarantee</li>
          </ul>

          <a href="${SHOPICLEAN_CONFIG.checkoutUrl}" 
             class="lemonsqueezy-button block text-center w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer">
            Unlock Full Download — $9
          </a>
        </div>

        <!-- Restore / Enter License -->
        <div class="border-t border-slate-100 pt-4 text-center">
          <button type="button" id="toggle-key-input" onclick="toggleKeyRestore()" class="text-xs text-slate-500 hover:text-slate-800 underline">
            Already have a license key?
          </button>
          
          <div id="license-restore-box" class="hidden mt-3">
            <div class="flex gap-2">
              <input type="text" id="manual-license-input" placeholder="Paste License Key" 
                     class="flex-1 px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
              <button type="button" onclick="handleManualKeySubmit()" 
                      class="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition-colors">
                Verify
              </button>
            </div>
            <p id="license-feedback" class="text-xs mt-1.5 hidden"></p>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 10. Hook into Lemon Squeezy event handler for automatic checkout unlock
if (typeof window !== 'undefined') {
  window.createLemonSqueezy?.();
  window.LemonSqueezy?.Setup({
    eventHandler: (event) => {
      if (event && event.event === 'OrderCreated') {
        const key = event.data?.order?.first_order_item?.license_key;
        if (key) {
          saveLicense(key);
        } else {
          saveLicense('active_session_customer');
        }
        closePaywallModal();
        if (typeof window._shopicleanPaymentSuccessCallback === 'function') {
          window._shopicleanPaymentSuccessCallback();
        }
      }
    }
  });
}