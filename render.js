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
    previousPassage: null
};

function saveGame(slotName = 'autosave') {
    const saveData = {
        currentPassage: gameState.currentPassage,
        previousPassage: gameState.previousPassage,
        visitedPassages: Array.from(gameState.visitedPassages),
        rngSeed: gameState.rng.seed,
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

async function loadGame(slotName = 'autosave') {
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
        
        await renderPassage(saveData.currentPassage);
        
        console.log(`Game loaded from slot: ${slotName}`);
        return true;
    } catch (error) {
        console.error('Failed to load game:', error);
        return false;
    }
}

function getSaveSlots() {
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

function deleteSave(slotName) {
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

function extractOnclickMacros(text) {
    const tokenPattern = /<<onclick\b[^>]*>>|<<\/onclick>>/g;
    const stack = [];
    const matches = [];
    const startToken = '<<onclick';
    const endToken = '<</onclick>>';

    for (const token of text.matchAll(tokenPattern)) {
        const tokenText = token[0];
        const tokenIndex = token.index;

        if (tokenText.startsWith(startToken)) {
            stack.push({ index: tokenIndex });
            continue;
        }

        if (stack.length === 0) continue;

        const open = stack.pop();
        const fullMatch = text.slice(open.index, tokenIndex + endToken.length);
        const content = fullMatch.slice(startToken.length, fullMatch.length - endToken.length);
        matches.push({
            content,
            fullMatch,
            index: open.index
        });
    }

    return matches;
}

function extractTextColorBlockMacros(text) {
    const tokenPattern = /<<textcolor\b[^>]*>>|<<\/textcolor>>/g;
    const stack = [];
    const matches = [];
    const startToken = '<<textcolor';
    const endToken = '<</textcolor>>';

    for (const token of text.matchAll(tokenPattern)) {
        const tokenText = token[0];
        const tokenIndex = token.index;

        if (tokenText.startsWith(startToken)) {
            stack.push({ index: tokenIndex });
            continue;
        }

        if (stack.length === 0) continue;

        const open = stack.pop();
        const fullMatch = text.slice(open.index, tokenIndex + endToken.length);
        const content = fullMatch.slice(startToken.length, fullMatch.length - endToken.length);
        matches.push({
            content,
            fullMatch,
            index: open.index
        });
    }

    return matches;
}
function protectCodeBlocks(text) {
    const codeBlocks = [];
    let counter = 0;
    
    let result = text.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
        const placeholder = `___CODE_BLOCK_${counter}___`;
        codeBlocks.push({ placeholder, content: match });
        counter++;
        return placeholder;
    });
    

    result = result.replace(/(`[^`\n]+?`)/g, (match) => {
        const placeholder = `___CODE_BLOCK_${counter}___`;
        codeBlocks.push({ placeholder, content: match });
        counter++;
        return placeholder;
    });
    
    return { text: result, codeBlocks };
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
            state: { onclickRevealCounter: 0 }
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

        preloadLinkedPassages(processedMarkup);
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
        state: context.state || { onclickRevealCounter: 0 }
    };

    const { text: protectedText, codeBlocks } = protectCodeBlocks(text);

    let processedText = parseBackgroundColor(protectedText);
    processedText = parseAnimations(processedText, contextWithState, depth);
    processedText = parseTextColor(processedText, contextWithState, depth);

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

function parseInlineMarkdown(text) {
    if (window.marked) {
        return window.marked.parseInline(text);
    }
    return text;
}

function parseBackgroundColor(text) {
    const bgMacros = extractBetweenDelimiter(text, '<<bgcolor', '>>');
    
    if (bgMacros.length === 0) {
        document.body.style.backgroundColor = '#101114';
        return text;
    }
    
    for (const macro of bgMacros) {
        const colorMatch = macro.content.match(/color=["']([^"']+)["']/);
        if (colorMatch) {
            const color = colorMatch[1];
            document.body.style.backgroundColor = color;
        }
        text = text.replace(macro.fullMatch, '');
    }
    
    return text;
}

function parseTextColor(text, context = {}, depth = 0) {
    let result = text;

    while (true) {
        const blockMacros = extractTextColorBlockMacros(result);
        if (blockMacros.length === 0) break;

        const macro = blockMacros.reduce((rightmost, current) => {
            return current.index > rightmost.index ? current : rightmost;
        });

        const partsMatch = macro.content.match(/^([\s\S]*?)>>([\s\S]*)$/);
        if (!partsMatch) break;

        const attrs = partsMatch[1];
        const body = partsMatch[2];
        const colorMatch = attrs.match(/color=["']([^"']+)["']/);
        const color = colorMatch ? colorMatch[1] : null;

        const { html: innerHTML, useBlockMarkdown } = renderBlockAwareMacroBody(body, context, depth);

        const tag = useBlockMarkdown ? 'div' : 'span';
        const replacement = color
            ? `<${tag} style="color: ${color};">${innerHTML}</${tag}>`
            : innerHTML;

        const before = result.slice(0, macro.index);
        const after = result.slice(macro.index + macro.fullMatch.length);
        result = `${before}${replacement}${after}`;
    }

    const textColorMacros = extractBetweenDelimiter(result, '<<textcolor', '>>');
    for (const macro of textColorMacros) {
        const colorMatch = macro.content.match(/color=["']([^"']+)["']/);
        if (colorMatch) {
            document.body.style.color = colorMatch[1];
        }
        result = result.replace(macro.fullMatch, '');
    }

    return result;
}

function parseBlockMarkdown(raw) {
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/m.test(raw)) return true;
    if (/^\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|~~~)/m.test(raw)) return true;
    if (/\n\s*\n/.test(raw)) return true;
    return false;
}

function parseAnimations(text, context = {}, depth = 0) {
    let result = text;
    const runtimeState = context.state || { onclickRevealCounter: 0 };
    
    // Parse <<fadein delay="1000">>text<</fadein>>
    const fadeins = extractBetweenDelimiter(result, '<<fadein', '<</fadein>>');
    for (const macro of fadeins) {
        const delayMatch = macro.content.match(/delay="(\d+)">>(.*)/s);
        if (delayMatch) {
            const delay = delayMatch[1];
            const content = renderInlineMacroBody(delayMatch[2], context, depth);
            const html = `<span class="fade-in" style="animation-delay: ${delay}ms;">${content}</span>`;
            result = result.replace(macro.fullMatch, html);
        }
    }
    
    // Parse <<delayed time="2000">>text<</delayed>>
    const delayeds = extractBetweenDelimiter(result, '<<delayed', '<</delayed>>');
    for (const macro of delayeds) {
        const timeMatch = macro.content.match(/time="(\d+)">>(.*)/s);
        if (timeMatch) {
            const time = timeMatch[1];
            const content = renderInlineMacroBody(timeMatch[2], context, depth);
            const html = `<span class="delayed" style="animation-delay: ${time}ms;">${content}</span>`;
            result = result.replace(macro.fullMatch, html);
        }
    }
    
    // Parse <<wiggle>>text<</wiggle>>
    const wiggles = extractBetweenDelimiter(result, '<<wiggle>>', '<</wiggle>>');
    for (const macro of wiggles) {

        const htmlContent = renderInlineMacroBody(macro.content, context, depth);
        
        const parts = htmlContent.split(/(<[^>]+>)/);
        
        const processedParts = parts.map(part => {

            if (part.startsWith('<')) {
                return part;
            }

            return part.split('').map(char => {
                if (char === ' ') return ' ';
                const randomDelay = Math.random() * 0.3;
                const randomDuration = 0.3 + Math.random() * 0.3; 
                return `<span style="animation-delay: ${randomDelay}s; animation-duration: ${randomDuration}s;">${char}</span>`;
            }).join('');
        });
        
        const html = `<span class="wiggle">${processedParts.join('')}</span>`;
        result = result.replace(macro.fullMatch, html);
    }
    
    // Parse <<typewriter speed="50">>text<</typewriter>>
    const typewriters = extractBetweenDelimiter(result, '<<typewriter', '<</typewriter>>');
    for (const macro of typewriters) {
        const speedMatch = macro.content.match(/speed="(\d+)">>(.*)/s);
        if (speedMatch) {
            const speed = speedMatch[1];
            const content = speedMatch[2];
            const html = `<span class="typewriter" data-speed="${speed}" data-text="${content.replace(/"/g, '&quot;')}"></span>`;
            result = result.replace(macro.fullMatch, html);
        }
    }
    
    // Parse <<button text="label" onclick="js code">>
    const buttons = extractBetweenDelimiter(result, '<<button', '>>');
    for (const macro of buttons) {
        const textMatch = macro.content.match(/text="([^"]+)"/);
        const onclickMatch = macro.content.match(/onclick="([^"]+)"/);
        
        if (textMatch && onclickMatch) {
            const text = parseInlineMarkdown(textMatch[1]);
            const onclick = onclickMatch[1].replace(/&quot;/g, '"');
            const html = `<button class="interactive-button" onclick="${onclick}">${text}</button>`;
            result = result.replace(macro.fullMatch, html);
        }
    }
    
    // Parse <<onclick action="...">>text<</onclick>>
    while (true) {
        const onclicks = extractOnclickMacros(result);
        if (onclicks.length === 0) break;

        const macro = onclicks.reduce((rightmost, current) => {
            return current.index > rightmost.index ? current : rightmost;
        });

        const partsMatch = macro.content.match(/^([\s\S]*?)>>([\s\S]*)$/);
        if (!partsMatch) break;

        const attrs = partsMatch[1];
        const body = partsMatch[2];
        const actionMatch = attrs.match(/(?:action|js|onclick)=["']([\s\S]*?)["']/);
        const action = actionMatch ? actionMatch[1].replace(/&quot;/g, '"') : '';
        const hasAction = Boolean(action.trim());

        const textAttrMatch = attrs.match(/text=["']([\s\S]*?)["']/);
        const triggerText = textAttrMatch ? textAttrMatch[1] : '';
        const hasTriggerText = Boolean(triggerText.trim());
        const hasBodyContent = Boolean(body.trim());
        const revealEnabled = hasBodyContent;

        let replacementHTML = null;

        if (revealEnabled) {
            const { html: hiddenContent, useBlockMarkdown } = renderBlockAwareMacroBody(body, context, depth);
            const containerTag = useBlockMarkdown ? 'div' : 'span';
            const displayType = useBlockMarkdown ? 'block' : 'inline';
            const currentId = `onclick-reveal-${runtimeState.onclickRevealCounter++}`;
            const autoReveal = !hasTriggerText;

            let onclickCode = `var el = document.getElementById('${currentId}'); el.style.display='${displayType}'; el.style.animation='fadeInText 0.3s ease-in'; this.style.display='none'; window.activateAnimations();`;
            if (hasAction) {
                onclickCode += ` try { ${action} } catch (error) { console.error('Onclick action failed:', error); }`;
            }

            const clickLabel = hasTriggerText ? parseInlineMarkdown(triggerText) : '';
            const triggerStyle = hasTriggerText
                ? 'cursor: pointer; text-decoration: underline;'
                : 'display: none;';
            replacementHTML = `<span id="${currentId}-trigger" class="clickable-text onclick-reveal-trigger" data-auto="${autoReveal}" onclick="${onclickCode}" style="${triggerStyle}">${clickLabel}</span><${containerTag} id="${currentId}" style="display: none;">${hiddenContent}</${containerTag}>`;
        } else {
            const displayText = hasTriggerText ? triggerText : body;
            if (!displayText.trim()) {
                replacementHTML = '';
            } else {
                const content = parseInlineMarkdown(displayText);
                replacementHTML = hasAction
                    ? `<span class="clickable-text" onclick="${action}" style="cursor: pointer; text-decoration: underline;">${content}</span>`
                    : content;
            }
        }

        const before = result.slice(0, macro.index);
        const after = result.slice(macro.index + macro.fullMatch.length);
        result = `${before}${replacementHTML}${after}`;
    }
    
    return result;
}


window.activateAnimations = function() {
    
    document.querySelectorAll('.typewriter').forEach(elem => {
        if (elem.dataset.animated) return; 
        elem.dataset.animated = 'true';
        
        const text = elem.dataset.text;
        const speed = parseInt(elem.dataset.speed) || 50;
        let index = 0;
        
        elem.textContent = '';
        elem.style.whiteSpace = 'normal'; 
        
        const interval = setInterval(() => {
            if (index < text.length) {
                elem.textContent += text[index];
                index++;
            } else {
                clearInterval(interval);
            }
        }, speed);
    });
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
        const tokenPattern = /^[A-Za-z0-9][A-Za-z0-9_\/-]*$/;

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
    if (currentInfo.rootGroup !== selectedInfo.rootGroup) {
        return null;
    }

    const transitionName = `T-${transitionTokenFromPassage(currentPassage)}-${transitionTokenFromPassage(selectedPassage)}`;
    const candidateGroups = Array.from(new Set([
        currentInfo.rootGroup,
        currentInfo.groupPath,
        selectedInfo.groupPath
    ]));

    for (const groupPath of candidateGroups) {
        const transitionReference = `${groupPath}/transitions/${transitionName}`;
        const response = await fetch(getPassagePath(transitionReference), { method: 'HEAD' });
        if (response.ok) {
            return transitionReference;
        }
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
    if (click.target.classList.contains('passage-link')) {
        click.preventDefault();
        try {
            const targetPassage = await handleLinkClick(click.target);
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