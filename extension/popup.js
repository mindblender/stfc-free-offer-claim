'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggle');
    const status = document.getElementById('status');
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;

    storage.get(['enabled']).then((result) => {
        const enabled = result.enabled !== false;
        toggle.checked = enabled;
        updateStatus(enabled);
    });

    toggle.addEventListener('change', () => {
        const enabled = toggle.checked;
        storage.set({ enabled });
        updateStatus(enabled);
    });

    function updateStatus(enabled) {
        status.textContent = enabled ? 'Auto-claiming: ON' : 'Auto-claiming: OFF';
        status.className = 'status ' + (enabled ? 'on' : 'off');
    }
});
