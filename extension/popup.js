'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggle');
    const status = document.getElementById('status');
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const action  = typeof browser !== 'undefined' ? browser.action  : chrome.action;

    storage.get(['enabled']).then((result) => {
        const enabled = result.enabled !== false;
        toggle.checked = enabled;
        updateStatus(enabled);
        applyIcon(enabled);
    });

    toggle.addEventListener('change', () => {
        const enabled = toggle.checked;
        storage.set({ enabled });
        updateStatus(enabled);
        applyIcon(enabled);
    });

    function updateStatus(enabled) {
        status.textContent = enabled ? 'Auto-claiming: ON' : 'Auto-claiming: OFF';
        status.className   = 'status ' + (enabled ? 'on' : 'off');
    }

    function applyIcon(enabled) {
        action.setIcon({
            path: {
                16: enabled ? 'icons/icon16-green.png' : 'icons/icon16-red.png',
                48: enabled ? 'icons/icon48-green.png' : 'icons/icon48-red.png'
            }
        });
    }
});
