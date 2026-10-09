/**
 * ShopiClean License & Payment Gate Controller
 * 100% Client-side, zero backend dependencies.
 * Powered by Dodo Payments (Merchant of Record)
 */

const SHOPICLEAN_CONFIG = {
  storageKey: 'shopiclean_license_key',
  // Toggle this flag to true on October 14 to enable public checkout
  isLaunchLive: false,
  // Dodo Payments Checkout URL (Ready to swap to live on Oct 12/14)
  checkoutUrl: 'https://test.checkout.dodopayments.com/buy/pdt_0NoiP2d0U9zaohffab1pf?quantity=1',
  // Endpoints
  validationEndpoint: 'https://test.dodopayments.com/licenses/validate'
};

// GA4 Tracking Helpers
function trackGA4Event(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

function trackPurchaseEvent(licenseKey) {
  if (!licenseKey) return;
  const trackingFlagKey = `shopiclean_tracked_purchase_${licenseKey}`;

  // Guard against duplicate purchase telemetry
  if (localStorage.getItem(trackingFlagKey)) {
    return;
  }

  trackGA4Event('purchase', {
    transaction_id: licenseKey,
    value: 9.00,
    currency: 'USD',
    items: [{
      item_id: 'pass_7day',
      item_name: 'ShopiClean 7-Day Pass',
      price: 9.00,
      quantity: 1
    }]
  });

  localStorage.setItem(trackingFlagKey, 'true');
}

// 1. Retrieve saved license key
function getSavedLicense() {
  const key = localStorage.getItem(SHOPICLEAN_CONFIG.storageKey);
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
}

// 2. Check if a key exists locally (fast initial check)
function hasActiveLicense() {
  return !!getSavedLicense();
}

// 3. Persist license key to browser
function saveLicense(key) {
  if (key && key.trim()) {
    localStorage.setItem(SHOPICLEAN_CONFIG.storageKey, key.trim());
  }
}

// 4. Clear license key (resets local access)
function clearSavedLicense() {
  localStorage.removeItem(SHOPICLEAN_CONFIG.storageKey);
}

// 5. Query Dodo Payments API with graceful network fault tolerance
async function verifyDodoLicense(key) {
  const cleanKey = (key || '').trim();
  if (!cleanKey) return { status: 'invalid' };

  try {
    const response = await fetch(SHOPICLEAN_CONFIG.validationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: cleanKey
      })
    });

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      return { status: 'invalid' };
    }

    if (!response.ok) {
      // 5xx server issues or unexpected gateway responses
      console.warn('Dodo API temporary gateway issue:', response.status);
      return { status: 'network_error' };
    }

    const data = await response.json();
    if (data && (data.valid === true || data.status === 'active')) {
      return { status: 'valid' };
    }

    return { status: 'invalid' };
  } catch (err) {
    // Network disconnection, offline mode, ad-blocker drop
    console.warn('Dodo network request failed. Retaining local state:', err);
    return { status: 'network_error' };
  }
}

// 6. Master Export Gate
async function exportWithLicenseCheck(downloadCallback) {
  const savedKey = getSavedLicense();

  if (!savedKey) {
    openPaywallModal(downloadCallback);
    return;
  }

  const result = await verifyDodoLicense(savedKey);

  if (result.status === 'valid' || result.status === 'network_error') {
    // Pass verification or fail-soft on temporary network blips
    if (typeof downloadCallback === 'function') {
      downloadCallback();
    }
  } else {
    // Only wipe when explicitly confirmed invalid/revoked/expired
    clearSavedLicense();
    openPaywallModal(downloadCallback);

    toggleKeyRestore(true);
    const feedback = document.getElementById('license-feedback');
    if (feedback) {
      feedback.classList.remove('hidden', 'text-emerald-600', 'text-slate-500');
      feedback.classList.add('text-red-500');
      feedback.textContent = 'Your pass has expired or was revoked. Please purchase a new pass.';
    }
  }
}

// 7. Open Paywall Modal and capture export callback
function openPaywallModal(onSuccessCallback) {
  let modal = document.getElementById('shopiclean-paywall-modal');
  if (!modal) {
    injectPaywallModal();
    modal = document.getElementById('shopiclean-paywall-modal');
  }

  trackGA4Event('begin_checkout', {
    value: 9.00,
    currency: 'USD',
    items: [{
      item_id: 'pass_7day',
      item_name: 'ShopiClean 7-Day Pass',
      price: 9.00,
      quantity: 1
    }]
  });

  window._shopicleanPaymentSuccessCallback = onSuccessCallback;
  modal.classList.remove('hidden');
}

// 8. Close Paywall Modal
function closePaywallModal() {
  const modal = document.getElementById('shopiclean-paywall-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 9. Toggle manual key entry box
function toggleKeyRestore(forceOpen = false) {
  const box = document.getElementById('license-restore-box');
  if (box) {
    if (forceOpen) {
      box.classList.remove('hidden');
    } else {
      box.classList.toggle('hidden');
    }
  }
}

// 10. Handle manual key validation submit
async function handleManualKeySubmit() {
  const input = document.getElementById('manual-license-input');
  const feedback = document.getElementById('license-feedback');
  const key = input ? input.value.trim() : '';

  if (!key) return;

  feedback.classList.remove('hidden', 'text-red-500', 'text-emerald-600');
  feedback.classList.add('text-slate-500');
  feedback.textContent = 'Verifying key with Dodo Payments...';

  const result = await verifyDodoLicense(key);

  if (result.status === 'valid') {
    saveLicense(key);
    trackPurchaseEvent(key);

    feedback.classList.remove('text-slate-500');
    feedback.classList.add('text-emerald-600');
    feedback.textContent = 'License activated! Starting export...';

    setTimeout(() => {
      closePaywallModal();
      if (typeof window._shopicleanPaymentSuccessCallback === 'function') {
        window._shopicleanPaymentSuccessCallback();
      }
    }, 700);
  } else if (result.status === 'network_error') {
    feedback.classList.remove('text-slate-500');
    feedback.classList.add('text-amber-600');
    feedback.textContent = 'Connection error. Please check your network and retry.';
  } else {
    feedback.classList.remove('text-slate-500');
    feedback.classList.add('text-red-500');
    feedback.textContent = 'Invalid or expired key. Please check your purchase receipt.';
  }
}

// 11. Auto-capture license key on payment redirect with verification handshake
(async function autoCaptureRedirectKey() {
  try {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('license_key');
    if (key && key.trim()) {
      const cleanKey = key.trim();

      // Clean query parameters from address bar immediately for privacy
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      // Verify before storing and tracking
      const result = await verifyDodoLicense(cleanKey);
      if (result.status === 'valid') {
        saveLicense(cleanKey);
        trackPurchaseEvent(cleanKey);
      }
    }
  } catch (err) {
    console.warn('Redirect key capture error:', err);
  }
})();

// 12. Inject Modal Markup into DOM
function injectPaywallModal() {
  const checkoutActionHtml = SHOPICLEAN_CONFIG.isLaunchLive
    ? `<a href="${SHOPICLEAN_CONFIG.checkoutUrl}" 
          target="_blank" 
          rel="noopener noreferrer"
          onclick="trackGA4Event('checkout_button_click', { value: 9.00, currency: 'USD' })"
          class="block text-center w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer">
         Unlock Full Download — $9
       </a>`
    : `<button type="button" 
               disabled 
               class="block text-center w-full py-3 px-4 rounded-lg bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed border border-slate-300 shadow-inner">
         Launching October 14 — Pass Unlocks Soon
       </button>`;

  const modalHtml = `
    <div id="shopiclean-paywall-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 text-slate-800">
        
        <button type="button" onclick="closePaywallModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none">&times;</button>
        
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-3 text-2xl">
            ✓
          </div>
          <h3 class="text-xl font-bold text-slate-900">Your File Is Cleaned &amp; Ready</h3>
          <p class="text-sm text-slate-500 mt-1">Unlock instant exports and fixes across all 4 utilities.</p>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-baseline mb-1">
            <span class="font-semibold text-slate-900 text-base">7-Day Launch Pass</span>
            <span class="text-2xl font-black text-slate-900">$9</span>
          </div>
          <p class="text-xs text-slate-500 mb-3">One-time payment • No auto-renewal • Unlimited file downloads</p>
          <ul class="text-xs text-slate-600 space-y-1.5 mb-4">
            <li class="flex items-center">✓ 100% in-browser client privacy (zero CSV server uploads)</li>
            <li class="flex items-center">✓ Unlimited CSV exports across all 4 tools</li>
            <li class="flex items-center">✓ Instant automated license key delivery</li>
          </ul>

          ${checkoutActionHtml}

          <div class="mt-3 pt-2.5 border-t border-slate-200 text-center">
            <p class="text-[11px] font-semibold text-slate-700">
              🛡️ 100% Money-Back Clean Import Guarantee
            </p>
            <p class="text-[10px] text-slate-500 mt-0.5 leading-tight">
              Covers CSV formatting, quoting, syntax, and header errors. Excludes store-level Shopify permission locks and remote image hosting downtime.
            </p>
          </div>
        </div>

        <p class="text-[11px] text-slate-400 text-center leading-normal mb-4">
          Your catalog data is processed 100% locally in your browser. We never see or store your files. Only your license key is verified via Dodo Payments.
        </p>

        <div class="border-t border-slate-100 pt-3 text-center">
          <button type="button" id="toggle-key-input" onclick="toggleKeyRestore()" class="text-xs text-slate-500 hover:text-slate-800 underline">
            Already have a license key? Restore access
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