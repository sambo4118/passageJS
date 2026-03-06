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
    const rawText = await loadPassage(passageName);
    
    const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@11/+esm');
    window.marked = marked;

    const processedMarkup = processPassageMarkup(rawText, {
        currentPassageName: passageName,
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
    gameState.currentPassage = passageName;
    gameState.visitedPassages.add(passageName);
    
    saveGame('autosave');
    
    preloadLinkedPassages(processedMarkup);
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
function getManifestPathForGroup(groupName) {
    const groupParts = groupName.split("_");
    const rootGroup = groupParts[0];
    const subgroupParts = groupParts.slice(1);

    if (subgroupParts.length === 0) {
        return `./passages/${rootGroup}/manifest.json`;
    }

    return `./passages/${rootGroup}/${subgroupParts.join("/")}/manifest.json`;
}


function getPassagePath(passageName) {
    const firstUnderscore = passageName.indexOf("_");
    const groupName = firstUnderscore === -1 ? "" : passageName.slice(0, firstUnderscore);
    const fileID = firstUnderscore === -1 ? "" : passageName.slice(firstUnderscore + 1);

    if (!groupName || !fileID) {
        throw new Error(`Invalid passage name: ${passageName}`);
    }
    
    if (fileID.startsWith("transition_")) {
        const transitionFileID = fileID.slice("transition_".length);
        return `./passages/${groupName}/transitions/${transitionFileID}.psg`;
    } else {
        return `./passages/${groupName}/${fileID}.psg`;
    }
}

function getCandidatePassagePaths(passageName) {
    const primaryPath = getPassagePath(passageName);
    const firstUnderscore = passageName.indexOf("_");
    const fileID = firstUnderscore === -1 ? "" : passageName.slice(firstUnderscore + 1);

    if (!fileID || fileID.startsWith("transition_") || fileID.includes("/")) {
        return [primaryPath];
    }

    if (!fileID.includes("_")) {
        return [primaryPath];
    }

    const groupName = passageName.slice(0, firstUnderscore);
    const nestedPath = `./passages/${groupName}/${fileID.replace(/_/g, "/")}.psg`;

    if (nestedPath === primaryPath) {
        return [primaryPath];
    }

    return [nestedPath, primaryPath];
}

async function loadPassage(passageName) {
    const candidatePaths = getCandidatePassagePaths(passageName);
    let lastAttemptedPath = candidatePaths[0];

    for (const filePath of candidatePaths) {
        lastAttemptedPath = filePath;
        const response = await fetch(filePath);
        if (response.ok) {
            const passageText = await response.text();
            return parseLinks(passageText, passageName);
        }
    }

    throw new Error(`Failed to load ${lastAttemptedPath}`);
}

function parseLinks(text, currentPassageName) {
    const links = extractBetweenDelimiter(text, "[[", "]]");
    let result = text;
    const currentGroup = currentPassageName ? currentPassageName.split("_")[0] : '';

    for (const link of links) {
        const hasExplicitTarget = link.content.includes("|");
        const [displayText, target] = link.content.split("|").map(part => part.trim());
        const linkText = target ? displayText : link.content;
        let targetValue = target || link.content;

        const tokenPattern = /^[A-Za-z0-9][A-Za-z0-9_\/-]*$/;
        if (!hasExplicitTarget && !tokenPattern.test(targetValue)) {
            result = result.replace(link.fullMatch, linkText);
            continue;
        }
        
        // Handle @back special link
        if (targetValue === "@back") {
            const linkHTML = `<a href="#" class="passage-link" 
                data-type="back">${linkText}</a>`;
            result = result.replace(link.fullMatch, linkHTML);
            continue;
        }

        const isGroupBased = targetValue.startsWith("@");
        
        if (isGroupBased) {
            const targetGroup = targetValue.substring(1);
            const currentPassageID = currentPassageName ? currentPassageName.split("_").slice(1).join("_") : '';
            
            const linkHTML = `<a href="#" class="passage-link" 
                data-type="group" 
                data-group="${targetGroup}" 
                data-from-group="${currentGroup}" 
                data-from-id="${currentPassageID}">${linkText}</a>`;
            result = result.replace(link.fullMatch, linkHTML);
        } else {

            if (!targetValue.includes("_")) {

                targetValue = `${currentGroup}_${targetValue}`;
            }
            
            const linkHTML = `<a href="#" class="passage-link" 
                data-type="direct" 
                data-target="${targetValue}">${linkText}</a>`;
            result = result.replace(link.fullMatch, linkHTML);
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
            const candidatePaths = getCandidatePassagePaths(target);

            if (candidatePaths.length === 1) {
                fetch(candidatePaths[0]).catch(() => {});
            }
        } else if (type === 'group') {
            fetch(getManifestPathForGroup(group)).catch(() => {});
        }
    }
}

async function selectPassageFromGroup(groupName) {
    try {
        // Supports both:
        // - @groupName (loads passages/groupName/manifest.json)
        // - @groupName_subdir (loads passages/groupName/subdir/manifest.json)
        const groupParts = groupName.split("_");
        const rootGroup = groupParts[0];
        const subgroupParts = groupParts.slice(1);
        const subgroupKey = subgroupParts.join("_");
        const subgroupPath = subgroupParts.join("/");

        let candidateIds = [];

        if (subgroupParts.length > 0) {
            const subgroupManifestPath = getManifestPathForGroup(groupName);
            const subgroupResponse = await fetch(subgroupManifestPath);

            if (subgroupResponse.ok) {
                const subgroupManifest = await subgroupResponse.json();
                const availableLocalIDs = subgroupManifest.passages.filter(id => {
                    const fullPassageName = `${rootGroup}_${subgroupPath}/${id}`;
                    return !gameState.visitedPassages.has(fullPassageName);
                });

                if (availableLocalIDs.length === 0) {
                    console.warn(`All passages in group "${groupName}" have been visited`);
                    return null;
                }

                const selectedLocalID = gameState.rng.pickFrom(availableLocalIDs);
                return `${rootGroup}_${subgroupPath}/${selectedLocalID}`;
            } else {
                // Compatibility fallback for older repos that only have root manifests.
                const rootManifest = await fetch(`./passages/${rootGroup}/manifest.json`).then(r => r.json());
                candidateIds = rootManifest.passages.filter(id => id === subgroupKey || id.startsWith(`${subgroupKey}_`));
            }
        } else {
            const rootManifest = await fetch(`./passages/${rootGroup}/manifest.json`).then(r => r.json());
            candidateIds = rootManifest.passages;
        }

        const available = candidateIds.filter(id => {
            const fullPassageName = `${rootGroup}_${id}`;
            return !gameState.visitedPassages.has(fullPassageName);
        });
        
        if (available.length === 0) {
            console.warn(`All passages in group "${groupName}" have been visited`);
            return null;
        }
        
        const selectedID = gameState.rng.pickFrom(available);
        return `${rootGroup}_${selectedID}`;
    } catch (error) {
        console.error(`Failed to load manifest for group "${groupName}":`, error);
        return null;
    }
}

async function handleLinkClick(linkElement) {
    const { type, target, group, fromGroup, fromId } = linkElement.dataset;
    
    if (type === "back") {
        // Go back to previous passage
        if (gameState.previousPassage) {
            return gameState.previousPassage;
        } else {
            console.warn('No previous passage to go back to');
            return null;
        }
    } else if (type === "direct") {

        return target;
    } else if (type === "group") {

        const selectedPassage = await selectPassageFromGroup(group);
        if (!selectedPassage) {
            console.error(`Could not select passage from group "${group}"`);
            return null;
        }
        
        if (fromId && fromGroup) {
            const selectedID = selectedPassage.split("_").slice(1).join("_");
            const transitionFileName = `T-${fromId}-${selectedID}`;
            const transitionPath = `./passages/${fromGroup}/transitions/${transitionFileName}.psg`;
            
            try {
                const response = await fetch(transitionPath, { method: 'HEAD' });
                if (response.ok) {
                    return `${fromGroup}_transition_${transitionFileName}`;
                }
            } catch (error) {}
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
        const targetPassage = await handleLinkClick(click.target);
        if (targetPassage) {
            await renderPassage(targetPassage);
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
        renderPassage('menu_title-screen');
    }
});


window.changeBgColor = (color) => {
    document.body.style.backgroundColor = color;
};

window.changeTextColor = (color) => {
    document.body.style.color = color;
};