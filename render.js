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

export const gameState = {
    rng: new SeededRandom(Date.now()),
    visitedPassages: new Set(),
    currentPassage: null,
    previousPassage: null
};

export function saveGame(slotName = 'autosave') {
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

export function hasSave(slotName = 'autosave') {
    return localStorage.getItem(`passagejs_save_${slotName}`) !== null;
}

export function displayMainText(text) {
    const displayElement = document.getElementById("display");
    if (!displayElement) return;
    displayElement.textContent = text;
}

export function displayMainHTML(html) {
    const displayElement = document.getElementById("display");
    if (!displayElement) return;
    displayElement.innerHTML = html;
}

export function extractBetweenDelimiter(text, startDelimiter, endDelimiter) {
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

export async function loadPassage(passageName) {
    const split = passageName.split("_");
    const groupName = split[0];
    
    let filePath;
    if (split[1] === "transition") {

        const transitionFileID = split.slice(2).join("_"); 
        filePath = `./passages/${groupName}/transitions/${transitionFileID}.psg`;
    } else {
        const fileID = split.slice(1).join("_");
        filePath = `./passages/${groupName}/${fileID}.psg`;
    }
    
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to load ${filePath}`);
    return await response.text();
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

export async function renderPassage(passageName) {
    let text = await loadPassage(passageName);
    
    const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@11/+esm');
    window.marked = marked;
    
    const { text: protectedText, codeBlocks } = protectCodeBlocks(text);
    
    let processedText = parseBackgroundColor(protectedText);
    processedText = parseReveals(processedText);
    processedText = parseAnimations(processedText);
    processedText = parseLinks(processedText, passageName);
    
    text = restoreCodeBlocks(processedText, codeBlocks);
    
    const html = marked.parse(text);
    
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
    
    preloadLinkedPassages(text);
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

function parseReveals(text) {
    let result = text;
    let revealCounter = 0;
    
    const reveals = extractBetweenDelimiter(result, '<<reveal', '<</reveal>>');
    for (const macro of reveals) {
        const textMatch = macro.content.match(/text=["']([^"']+)["']>>(.*)/s);
        if (textMatch) {
            const clickText = parseInlineMarkdown(textMatch[1]);
            const hiddenContent = parseInlineMarkdown(textMatch[2]);
            const currentId = 'reveal-' + revealCounter;
            const nextId = 'reveal-' + (revealCounter + 1);
            
            const hasNext = revealCounter < reveals.length - 1;
            
            let onclick = `var el = document.getElementById('${currentId}'); el.style.display='inline'; el.style.animation='fadeInText 0.3s ease-in'; this.style.display='none'; window.activateAnimations();`;
            if (hasNext) {
                onclick += ` document.getElementById('${nextId}-trigger').style.display='inline';`;
            }
            
            const html = `<span id="${currentId}-trigger" class="clickable-text" onclick="${onclick}" style="cursor: pointer; text-decoration: underline; ${revealCounter > 0 ? 'display: none;' : ''}">${clickText}</span><span id="${currentId}" style="display: none;">${hiddenContent}</span>`;
            result = result.replace(macro.fullMatch, html);
            revealCounter++;
        }
    }
    
    return result;
}

function parseAnimations(text) {
    let result = text;
    
    // Parse <<fadein delay="1000">>text<</fadein>>
    const fadeins = extractBetweenDelimiter(result, '<<fadein', '<</fadein>>');
    for (const macro of fadeins) {
        const delayMatch = macro.content.match(/delay="(\d+)">>(.*)/s);
        if (delayMatch) {
            const delay = delayMatch[1];
            const content = parseInlineMarkdown(delayMatch[2]);
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
            const content = parseInlineMarkdown(timeMatch[2]);
            const html = `<span class="delayed" style="animation-delay: ${time}ms;">${content}</span>`;
            result = result.replace(macro.fullMatch, html);
        }
    }
    
    // Parse <<wiggle>>text<</wiggle>>
    const wiggles = extractBetweenDelimiter(result, '<<wiggle>>', '<</wiggle>>');
    for (const macro of wiggles) {

        const htmlContent = parseInlineMarkdown(macro.content);
        
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
    const onclicks = extractBetweenDelimiter(result, '<<onclick', '<</onclick>>');
    for (const macro of onclicks) {
        const actionMatch = macro.content.match(/action="([^"]+)">>(.*)/s);
        if (actionMatch) {
            const action = actionMatch[1].replace(/&quot;/g, '"');
            const content = parseInlineMarkdown(actionMatch[2]);
            const html = `<span class="clickable-text" onclick="${action}" style="cursor: pointer; text-decoration: underline;">${content}</span>`;
            result = result.replace(macro.fullMatch, html);
        }
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

async function preloadLinkedPassages(parsedText) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = parsedText;
    const links = tempDiv.querySelectorAll('.passage-link');
    
    for (const link of links) {
        const { type, target, group } = link.dataset;
        
        if (type === 'direct') {
            
            fetch(getPassagePath(target)).catch(() => {});
        } else if (type === 'group') {

            fetch(`./passages/${group}/manifest.json`).catch(() => {});
        }
    }
}


function getPassagePath(passageName) {
    const split = passageName.split("_");
    const groupName = split[0];
    
    if (split[1] === "transition") {
        const transitionFileID = split.slice(2).join("_");
        return `./passages/${groupName}/transitions/${transitionFileID}.psg`;
    } else {
        const fileID = split.slice(1).join("_");
        return `./passages/${groupName}/${fileID}.psg`;
    }
}


export function parseLinks(text, currentPassageName) {
    const links = extractBetweenDelimiter(text, "[[", "]]");
    let result = text;
    const currentGroup = currentPassageName ? currentPassageName.split("_")[0] : '';

    for (const link of links) {
        const [displayText, target] = link.content.split("|").map(part => part.trim());
        const linkText = target ? displayText : link.content;
        let targetValue = target || link.content;
        
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

export async function selectPassageFromGroup(groupName) {
    try {
        const manifest = await fetch(`./passages/${groupName}/manifest.json`).then(r => r.json());
        
        const available = manifest.passages.filter(id => {
            const fullPassageName = `${groupName}_${id}`;
            return !gameState.visitedPassages.has(fullPassageName);
        });
        
        if (available.length === 0) {
            console.warn(`All passages in group "${groupName}" have been visited`);
            return null;
        }
        
        const selectedID = gameState.rng.pickFrom(available);
        return `${groupName}_${selectedID}`;
    } catch (error) {
        console.error(`Failed to load manifest for group "${groupName}":`, error);
        return null;
    }
}

export async function handleLinkClick(linkElement) {
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

document.addEventListener('click', async (click) => {
    if (click.target.classList.contains('passage-link')) {
        click.preventDefault();
        const targetPassage = await handleLinkClick(click.target);
        if (targetPassage) {
            await renderPassage(targetPassage);
        }
    }
});


window.addEventListener('DOMContentLoaded', () => {

    const hash = window.location.hash.slice(1); 
    if (hash) {
        renderPassage(hash);
    } else {
        renderPassage('menu_title_screen');
    }
});


window.changeBgColor = (color) => {
    document.body.style.backgroundColor = color;
};

window.changeTextColor = (color) => {
    document.body.style.color = color;
};