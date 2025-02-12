import {
    changeColor,
    editColor,
    getColorOptions,
    getCurrentColor,
    getHighlights,
    getLostHighlights,
    highlightText,
    loadPageHighlights,
    removeHighlight,
    removeHighlights,
    showHighlight,
    toggleHighlighterCursor,
} from './actions/index.js';
import { trackEvent } from './analytics.js';
import { wrapResponse } from './utils.js';


function initialize() {
    initializeContextMenus();
    initializeContextMenuEventListeners();
    initializeExtensionEventListeners();
    initializeTabEventListeners();
    initializeKeyboardShortcutEventListeners();
    initializeMessageEventListeners();
}


function initializeContextMenus() {
    // Add option when right-clicking
    chrome.runtime.onInstalled.addListener(async () => {
        // remove existing menu items
        chrome.contextMenus.removeAll();

        chrome.contextMenus.create({ title: 'Highlight', id: 'highlight', contexts: ['selection'] });
        chrome.contextMenus.create({ title: 'Activate LAYR Cursor', id: 'toggle-cursor' });
        chrome.contextMenus.create({ title: 'Highlighter color', id: 'highlight-colors' });
        chrome.contextMenus.create({ title: 'Like', id: 'green', parentId: 'highlight-colors', type: 'radio' });
        chrome.contextMenus.create({ title: 'Dislike', id: 'red', parentId: 'highlight-colors', type: 'radio' });
        chrome.contextMenus.create({ title: 'Highlight', id: 'grey', parentId: 'highlight-colors', type: 'radio' });

        // Get the initial selected color value
        const { title: colorTitle } = await getCurrentColor();
        chrome.contextMenus.update(colorTitle, { checked: true });
    });
}

function initializeContextMenuEventListeners() {
    chrome.contextMenus.onClicked.addListener(({ menuItemId, parentMenuItemId }) => {
        if (parentMenuItemId === 'highlight-color') {
            trackEvent('color-change-source', 'context-menu');
            changeColor(menuItemId);
            return;
        }

        switch (menuItemId) {
            case 'highlight':
                trackEvent('highlight-source', 'context-menu');
                highlightText();
                break;
            case 'toggle-cursor':
                trackEvent('toggle-cursor-source', 'context-menu');
                toggleHighlighterCursor();
                break;
        }
    });
}

function initializeExtensionEventListeners() {
    // Analytics (non-interactive events)
    chrome.runtime.onInstalled.addListener(() => {
        trackEvent('extension', 'installed', chrome.runtime.getManifest().version, null, { ni: 1 });
    });
    chrome.runtime.onStartup.addListener(() => {
        trackEvent('extension', 'startup', null, null, { ni: 1 });
    });
}


function initializeTabEventListeners() {
    // If the URL changes, try again to highlight
    // This is done to support javascript Single-page applications
    // which often change the URL without reloading the page
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
        if (changeInfo.url) {
            loadPageHighlights(tabId);
        }
    });
}

function initializeKeyboardShortcutEventListeners() {
    // Add Keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
        switch (command) {
            case 'execute-highlight':
                trackEvent('highlight-source', 'keyboard-shortcut');
                highlightText();
                break;
            case 'toggle-highlighter-cursor':
                trackEvent('toggle-cursor-source', 'keyboard-shortcut');
                toggleHighlighterCursor();
                break;
            case 'change-color-to-green':
                trackEvent('color-change-source', 'keyboard-shortcut');
                changeColor('green');
                break;
            case 'change-color-to-red':
                trackEvent('color-change-source', 'keyboard-shortcut');
                changeColor('red');
                break;
            case 'change-color-to-grey':
                trackEvent('color-change-source', 'keyboard-shortcut');
                changeColor('grey');
                break;
        }
    });
}

function initializeMessageEventListeners() {
    // Listen to messages from content scripts
    /* eslint-disable consistent-return */
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        if (!request.action) return;

        switch (request.action) {
            case 'highlight':
                trackEvent('highlight-source', 'highlighter-cursor');
                highlightText();
                return;
            case 'track-event':
                trackEvent(request.trackCategory, request.trackAction);
                return;
            case 'remove-highlights':
                removeHighlights();
                return;
            case 'remove-highlight':
                removeHighlight(request.highlightId);
                return;
            case 'change-color':
                trackEvent('color-change-source', request.source);
                changeColor(request.color);
                return;
            case 'edit-color':
                editColor(request.colorTitle, request.color, request.textColor);
                return;
            case 'toggle-highlighter-cursor':
                trackEvent('toggle-cursor-source', request.source);
                toggleHighlighterCursor();
                return;
            case 'get-highlights':
                wrapResponse(getHighlights(), sendResponse);
                return true; // return asynchronously
            case 'get-lost-highlights':
                wrapResponse(getLostHighlights(), sendResponse);
                return true; // return asynchronously
            case 'show-highlight':
                return showHighlight(request.highlightId);
            case 'get-current-color':
                wrapResponse(getCurrentColor(), sendResponse);
                return true; // return asynchronously
            case 'get-color-options':
                wrapResponse(getColorOptions(), sendResponse);
                return true; // return asynchronously
        }
    });
    /* eslint-enable consistent-return */
}

export { initialize };
