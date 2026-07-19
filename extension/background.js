'use strict';

const ICONS = {
    enabled:  { 16: 'icons/icon16-green.png', 48: 'icons/icon48-green.png' },
    disabled: { 16: 'icons/icon16-red.png',   48: 'icons/icon48-red.png'   }
};

function applyIcon(enabled) {
    chrome.action.setIcon({ path: enabled ? ICONS.enabled : ICONS.disabled });
}

function syncIcon() {
    chrome.storage.local.get(['enabled'], (result) => {
        applyIcon(result.enabled !== false);
    });
}

// Set default state and icon on first install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['enabled'], (result) => {
        if (result.enabled === undefined) {
            chrome.storage.local.set({ enabled: true });
        }
        applyIcon(result.enabled !== false);
    });
});

// Restore correct icon after browser restart (service workers can be stopped)
chrome.runtime.onStartup.addListener(syncIcon);

// Update icon immediately when the toggle changes
chrome.storage.onChanged.addListener((changes) => {
    if ('enabled' in changes) {
        applyIcon(changes.enabled.newValue);
    }
});
