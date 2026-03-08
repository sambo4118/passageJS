// Import macro parsing functions
import {
    parseBackgroundColor,
    parseTextColor,
    parseAnimations,
    parseVariables,
    parseVariablesAndSubstitutions,
    substituteVariables,
    parseCalculations,
    parseConditionals,
    parseInlineMarkdown,
    parseBlockMarkdown,
    protectOnclickContent,
    restoreOnclickContent,
    activateAnimations
} from './macros.js';

// Expose activateAnimations to window for inline onclick handlers
window.activateAnimations = activateAnimations;

// Function to update all variable displays in the DOM
window.updateVariableDisplays = function() {
    const displays = document.querySelectorAll('.var-display');
    displays.forEach(span => {
        const varName = span.getAttribute('data-var');
        if (varName && varName in gameState.variables) {
            const value = gameState.variables[varName];
            let displayValue;
            
            if (typeof value === 'object') {
                displayValue = escapeHtml(JSON.stringify(value));
            } else {
                displayValue = escapeHtml(String(value));
            }
            
            span.innerHTML = displayValue;
        }
    });
};

// Expose dynamic markup processor for runtime rendering (onclick, delayed, etc.)
window.renderDynamicContent = async function(elementId, rawMarkup) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found:', elementId);
        return;
    }
    
    // Ensure marked is loaded
    if (!window.marked) {
        const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@11/+esm');
        window.marked = marked;
    }
    
    // Process the markup exactly like a passage would be processed
    const context = {
        state: {
            onclickRevealCounter: 0,
            variables: gameState.variables,
            variableMetadata: gameState.variableMetadata
        }
    };
    
    const processedMarkup = processPassageMarkup(rawMarkup, context, 0);
    
    // Render as markdown exactly like a passage
    const html = window.marked.parse(processedMarkup);
    
    element.innerHTML = html;
    
    // Activate any animations in the newly rendered content
    window.activateAnimations();
    
    // Update all variable displays to reflect current values
    window.updateVariableDisplays();
    
    // Highlight any code blocks
    if (window.hljs) {
        element.querySelectorAll('pre code').forEach((block) => {
            window.hljs.highlightElement(block);
        });
    }
};

class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    
    pickFrom(array) {
        return array[Math.floor(this.next() * array.length)];
    }
}

const gameState = {
    rng: new SeededRandom(Date.now()),
    visitedPassages: new Set(),
    currentPassage: null,
    previousPassage: null,
    variables: {},
    variableMetadata: {}
};

export function saveGame(slotName = 'autosave') {
    const saveData = {
        currentPassage: gameState.currentPassage,
        previousPassage: gameState.previousPassage,
        visitedPassages: Array.from(gameState.visitedPassages),
        rngSeed: gameState.rng.seed,
        variables: gameState.variables,
        variableMetadata: gameState.variableMetadata,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(`passagejs_save_${slotName}`, JSON.stringify(saveData));
        console.log(`Game saved to slot: ${slotName}`);
        return true;
    } catch (error) {
        console.error('Failed to save game:', error);
        return false;
    }
}

export async function loadGame(slotName = 'autosave') {
    try {
        const saveDataStr = localStorage.getItem(`passagejs_save_${slotName}`);
        if (!saveDataStr) {
            console.warn(`No save found in slot: ${slotName}`);
            return false;
        }
        
        const saveData = JSON.parse(saveDataStr);
        
        gameState.currentPassage = saveData.currentPassage;
        gameState.previousPassage = saveData.previousPassage || null;
        gameState.visitedPassages = new Set(saveData.visitedPassages);
        gameState.rng = new SeededRandom(saveData.rngSeed);
        gameState.variables = saveData.variables || {};
        gameState.variableMetadata = saveData.variableMetadata || {};
        
        await renderPassage(saveData.currentPassage);
        
        console.log(`Game loaded from slot: ${slotName}`);
        return true;
    } catch (error) {
        console.error('Failed to load game:', error);
        return false;
    }
}

export function getSaveSlots() {
    const saves = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('passagejs_save_')) {
            const slotName = key.replace('passagejs_save_', '');
            const saveData = JSON.parse(localStorage.getItem(key));
            saves.push({
                slotName,
                currentPassage: saveData.currentPassage,
                timestamp: saveData.timestamp,
                date: new Date(saveData.timestamp).toLocaleString()
            });
        }
    }
    return saves.sort((a, b) => b.timestamp - a.timestamp);
}

export function deleteSave(slotName) {
    localStorage.removeItem(`passagejs_save_${slotName}`);
    console.log(`Deleted save slot: ${slotName}`);
}

function hasSave(slotName = 'autosave') {
    return localStorage.getItem(`passagejs_save_${slotName}`) !== null;
}

function displayMainText(text) {
    const displayElement = document.getElementById("display");
    if (!displayElement) return;
    displayElement.textContent = text;
}

function displayMainHTML(html) {
    const displayElement = document.getElementById("display");
    if (!displayElement) return;
    displayElement.innerHTML = html;
}

function extractBetweenDelimiter(text, startDelimiter, endDelimiter) {
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapeRegex(startDelimiter)}(.*?)${escapeRegex(endDelimiter)}`, 'gs');

    const matches = [];
    for (const match of text.matchAll(pattern)) {
        matches.push({
            content: match[1],
            fullMatch: match[0],
            index: match.index
        });
    }
    return matches;
}

function protectCodeBlocks(text) {
    const codeBlocks = [];
    let counter = 0;
    
    const protectedText = text.replace(/```[\s\S]*?```|`[^`]+`/g, (match) => {
        const placeholder = `___CODE_BLOCK_${counter}___`;
        codeBlocks.push({ placeholder, content: match });
        counter++;
        return placeholder;
    });
    
    return { text: protectedText, codeBlocks };
}

function restoreCodeBlocks(text, codeBlocks) {
    let result = text;
    for (const block of codeBlocks) {
        result = result.replace(block.placeholder, block.content);
    }
    return result;
}

async function renderPassage(passageName) {
    try {
        const { canonicalReference, parsedText } = await loadPassage(passageName);

        const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@11/+esm');
        window.marked = marked;

        const processedMarkup = processPassageMarkup(parsedText, {
            currentPassageName: canonicalReference,
            state: {
                onclickRevealCounter: 0,
                variables: gameState.variables,
                variableMetadata: gameState.variableMetadata
            }
        });
        const html = marked.parse(processedMarkup);

        displayMainHTML(html);

        if (window.hljs) {
            document.querySelectorAll('pre code').forEach((block) => {
                window.hljs.highlightElement(block);
            });
        }

        window.activateAnimations();

        gameState.previousPassage = gameState.currentPassage;
        gameState.currentPassage = canonicalReference;
        gameState.visitedPassages.add(canonicalReference);

        saveGame('autosave');

        preloadLinkedPassages(html);
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showNavigationError('Unable to open passage.', message);
        console.error('Render passage failed:', error);
        return false;
    }
}

const MAX_MACRO_RECURSION_DEPTH = 20;

function processPassageMarkup(text, context = {}, depth = 0) {
    if (depth > MAX_MACRO_RECURSION_DEPTH) {
        console.warn(`Macro recursion limit (${MAX_MACRO_RECURSION_DEPTH}) reached`);
        return text;
    }

    const contextWithState = {
        ...context,
        state: context.state || {
            onclickRevealCounter: 0,
            variables: gameState.variables,
            variableMetadata: gameState.variableMetadata
        }
    };

    const { text: protectedText, codeBlocks } = protectCodeBlocks(text);
    
    // Protect onclick and delayed content before variable processing
    const { text: textWithProtectedOnclick, protectedBlocks } = protectOnclickContent(protectedText);

    let processedText = parseBackgroundColor(textWithProtectedOnclick);
    processedText = parseVariablesAndSubstitutions(processedText, contextWithState, extractBetweenDelimiter);
    processedText = parseCalculations(processedText, contextWithState, extractBetweenDelimiter);
    processedText = parseConditionals(processedText, contextWithState, depth, renderBlockAwareMacroBody);
    
    // Restore onclick content before parseAnimations processes it
    processedText = restoreOnclickContent(processedText, protectedBlocks);
    
    processedText = parseAnimations(processedText, contextWithState, depth, renderInlineMacroBody, renderBlockAwareMacroBody, extractBetweenDelimiter);
    processedText = parseTextColor(processedText, contextWithState, depth, renderBlockAwareMacroBody, extractBetweenDelimiter);

    return restoreCodeBlocks(processedText, codeBlocks);
}

function renderInlineMacroBody(body, context, depth) {
    const processedBody = processPassageMarkup(body, context, depth + 1);
    return parseInlineMarkdown(processedBody);
}

function renderBlockAwareMacroBody(body, context, depth) {
    const processedBody = processPassageMarkup(body, context, depth + 1);
    const useBlockMarkdown = parseBlockMarkdown(processedBody);

    if (useBlockMarkdown && window.marked) {
        return {
            html: window.marked.parse(processedBody).trim(),
            useBlockMarkdown
        };
    }

    return {
        html: parseInlineMarkdown(processedBody),
        useBlockMarkdown
    };
}

// Passage linking and navigation helpers.
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeSlashes(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function splitPassageReference(reference) {
    const normalized = normalizeSlashes(reference);
    const parts = normalized.split('/').filter(Boolean);

    if (parts.length < 2) {
        throw new Error(`Invalid passage reference "${reference}". Use group/.../passage.`);
    }

    return {
        parts,
        groupPath: parts.slice(0, -1).join('/'),
        fileName: parts[parts.length - 1],
        rootGroup: parts[0]
    };
}

function normalizePassageReference(reference, currentGroupPath = '') {
    const source = normalizeSlashes(reference).trim();

    if (!source) {
        throw new Error('Passage reference is empty.');
    }

    if (source.includes('/')) {
        const parts = source.split('/').filter(Boolean);
        if (parts.length < 2) {
            throw new Error(`Invalid passage reference "${reference}". Use group/.../passage.`);
        }
        return parts.join('/');
    }

    const normalizedCurrentGroup = normalizeSlashes(currentGroupPath);
    if (!normalizedCurrentGroup) {
        throw new Error(`Relative passage reference "${reference}" has no current group context.`);
    }

    return `${normalizedCurrentGroup}/${source}`;
}

function getPassagePath(reference) {
    return `./passages/${reference}.psg`;
}

function getManifestPath(groupPath) {
    return `./passages/${groupPath}/manifest.json`;
}

function transitionTokenFromPassage(reference) {
    const { parts } = splitPassageReference(reference);
    return parts.slice(1).join('_');
}

function showNavigationError(message, details = '') {
    const detailText = details ? `<p><code>${escapeHtml(details)}</code></p>` : '';
    displayMainHTML(`<section class="passage-error"><h2>Navigation Error</h2><p>${escapeHtml(message)}</p>${detailText}</section>`);
}

async function loadPassage(passageName) {
    const canonicalReference = normalizePassageReference(passageName);
    const filePath = getPassagePath(canonicalReference);
    const response = await fetch(filePath);

    if (!response.ok) {
        throw new Error(`Passage not found: ${canonicalReference} (${filePath})`);
    }

    const passageText = await response.text();
    return {
        canonicalReference,
        parsedText: parseLinks(passageText, canonicalReference)
    };
}

function parseLinks(text, currentPassageName) {
    const links = extractBetweenDelimiter(text, "[[", "]]");
    let result = text;
    const currentGroupPath = currentPassageName ? splitPassageReference(currentPassageName).groupPath : '';

    for (const link of links) {
        const separatorIndex = link.content.indexOf('|');
        const hasExplicitTarget = separatorIndex !== -1;
        const linkText = hasExplicitTarget ? link.content.slice(0, separatorIndex).trim() : link.content.trim();
        const targetValue = hasExplicitTarget ? link.content.slice(separatorIndex + 1).trim() : link.content.trim();
        const tokenPattern = /^[A-Za-z0-9][A-Za-z0-9_\/*-]*$/;

        if (!hasExplicitTarget && !tokenPattern.test(targetValue)) {
            result = result.replace(link.fullMatch, linkText);
            continue;
        }

        if (!targetValue) {
            result = result.replace(link.fullMatch, linkText);
            continue;
        }

        try {
            if (targetValue.endsWith('/*')) {
                const groupPart = normalizeSlashes(targetValue.slice(0, -2));
                const resolvedGroup = groupPart || currentGroupPath;

                if (!resolvedGroup) {
                    throw new Error(`Random target "${targetValue}" has no group context.`);
                }

                const linkHTML = `<a href="#" class="passage-link" data-type="random" data-group="${escapeHtml(resolvedGroup)}">${linkText}</a>`;
                result = result.replace(link.fullMatch, linkHTML);
                continue;
            }

            const normalizedTarget = normalizePassageReference(targetValue, currentGroupPath);
            const linkHTML = `<a href="#" class="passage-link" data-type="direct" data-target="${escapeHtml(normalizedTarget)}">${linkText}</a>`;
            result = result.replace(link.fullMatch, linkHTML);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const invalidHTML = `<span class="passage-link-error" title="${escapeHtml(message)}">${linkText}</span>`;
            result = result.replace(link.fullMatch, invalidHTML);
        }
    }

    return result;
}

async function preloadLinkedPassages(parsedText) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = parsedText;
    const links = tempDiv.querySelectorAll('.passage-link');
    
    for (const link of links) {
        const { type, target, group } = link.dataset;
        
        if (type === 'direct') {
            fetch(getPassagePath(target)).catch(() => {});
        } else if (type === 'random') {
            fetch(getManifestPath(group)).catch(() => {});
        }
    }
}

async function selectPassageFromGroup(groupPath) {
    const normalizedGroupPath = normalizeSlashes(groupPath);
    if (!normalizedGroupPath) {
        throw new Error('Random group path is empty. Use group/.../* or */* from a passage group.');
    }

    const manifestPath = getManifestPath(normalizedGroupPath);
    const response = await fetch(manifestPath);
    if (!response.ok) {
        throw new Error(`Group manifest not found: ${manifestPath}`);
    }

    const manifest = await response.json();
    const passages = Array.isArray(manifest.passages) ? manifest.passages.filter(Boolean) : [];
    if (passages.length === 0) {
        throw new Error(`Group "${normalizedGroupPath}" has no passages in manifest.json.`);
    }

    return `${normalizedGroupPath}/${gameState.rng.pickFrom(passages)}`;
}

async function selectTransitionForRandomLink(currentPassage, selectedPassage) {
    if (!currentPassage || !selectedPassage) {
        return null;
    }

    const currentInfo = splitPassageReference(currentPassage);
    const selectedInfo = splitPassageReference(selectedPassage);

    const transitionName = `T-${transitionTokenFromPassage(currentPassage)}-${transitionTokenFromPassage(selectedPassage)}`;
    const transitionReference = `${currentInfo.groupPath}/transitions/${transitionName}`;
    const response = await fetch(getPassagePath(transitionReference), { method: 'HEAD' });
    if (response.ok) {
        return transitionReference;
    }

    return null;
}

async function handleLinkClick(linkElement) {
    const { type, target, group } = linkElement.dataset;

    if (type === "direct") {
        return target;
    } else if (type === "random") {
        const selectedPassage = await selectPassageFromGroup(group);
        const transitionPassage = await selectTransitionForRandomLink(gameState.currentPassage, selectedPassage);
        if (transitionPassage) {
            return transitionPassage;
        }

        return selectedPassage;
    }
    
    return null;
}

function shouldIgnoreGlobalRevealClick(target) {
    if (!(target instanceof Element)) return false;

    return Boolean(target.closest(
        'a, button, input, select, textarea, label, summary, details, [role="button"], [onclick], .passage-link, .interactive-button, .clickable-text'
    ));
}

function triggerNextAutoOnclickReveal() {
    const triggers = Array.from(document.querySelectorAll('.onclick-reveal-trigger[data-auto="true"]'));
    const nextTrigger = triggers.find((trigger) => {
        const revealId = trigger.id.replace('-trigger', '');
        const content = document.getElementById(revealId);
        if (!content) return false;
        return window.getComputedStyle(content).display === 'none';
    });

    if (!nextTrigger) return false;

    nextTrigger.click();
    return true;
}

document.addEventListener('click', async (click) => {
    const linkElement = click.target.closest('.passage-link');
    if (linkElement) {
        click.preventDefault();
        try {
            const targetPassage = await handleLinkClick(linkElement);
            if (targetPassage) {
                await renderPassage(targetPassage);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            showNavigationError('Unable to resolve selected link.', message);
            console.error('Link click failed:', error);
        }
    }
});

document.addEventListener('click', (click) => {
    if (click.defaultPrevented) return;
    if (shouldIgnoreGlobalRevealClick(click.target)) return;

    triggerNextAutoOnclickReveal();
});


window.addEventListener('DOMContentLoaded', () => {

    const hash = window.location.hash.slice(1); 
    if (hash) {
        renderPassage(hash);
    } else {
        renderPassage('menu/title-screen');
    }
});


window.changeBgColor = (color) => {
    document.body.style.backgroundColor = color;
};

window.changeTextColor = (color) => {
    document.body.style.color = color;
};