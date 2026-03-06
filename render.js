// Seeded random number generator for randomized group-based links
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

// Game state tracking RNG, visited passages, and current passage
export const gameState = {
    rng: new SeededRandom(Date.now()), // Default seed, can be changed
    visitedPassages: new Set(),
    currentPassage: null
};

// Save game state to localStorage
export function saveGame(slotName = 'autosave') {
    const saveData = {
        currentPassage: gameState.currentPassage,
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

// Load game state from localStorage
export async function loadGame(slotName = 'autosave') {
    try {
        const saveDataStr = localStorage.getItem(`passagejs_save_${slotName}`);
        if (!saveDataStr) {
            console.warn(`No save found in slot: ${slotName}`);
            return false;
        }
        
        const saveData = JSON.parse(saveDataStr);
        
        // Restore game state
        gameState.currentPassage = saveData.currentPassage;
        gameState.visitedPassages = new Set(saveData.visitedPassages);
        gameState.rng = new SeededRandom(saveData.rngSeed);
        
        // Render the saved passage
        await renderPassage(saveData.currentPassage);
        
        console.log(`Game loaded from slot: ${slotName}`);
        return true;
    } catch (error) {
        console.error('Failed to load game:', error);
        return false;
    }
}

// Get list of all save slots
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

// Delete a save slot
export function deleteSave(slotName) {
    localStorage.removeItem(`passagejs_save_${slotName}`);
    console.log(`Deleted save slot: ${slotName}`);
}

// Check if a save exists
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
        // Format: groupname_transition_fileID (e.g., intelectualization_transition_T-I1-M1)
        const transitionFileID = split.slice(2).join("_"); // Handle IDs with underscores
        filePath = `./passages/${groupName}/transitions/${transitionFileID}.md`;
    } else {
        // Format: groupname_fileID (e.g., intelectualization_I1)
        const fileID = split.slice(1).join("_"); // Handle IDs with underscores
        filePath = `./passages/${groupName}/${fileID}.md`;
    }
    
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to load ${filePath}`);
    return await response.text();
}

export async function renderPassage(passageName) {
    let text = await loadPassage(passageName);
    
    // Parse animation macros before links
    text = parseAnimations(text);
    text = parseLinks(text, passageName);
    
    // Convert markdown to HTML with marked
    const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@11/+esm');
    const html = marked.parse(text);
    
    displayMainHTML(html);
    
    // Activate animations
    activateAnimations();
    
    gameState.currentPassage = passageName;
    gameState.visitedPassages.add(passageName);
    
    // Autosave after each passage
    saveGame('autosave');
    
    // Preload linked passages
    preloadLinkedPassages(text);
}

// Parse animation macros
function parseAnimations(text) {
    let result = text;
    
    // Parse <<fadein delay="1000">>text<</fadein>>
    const fadeins = extractBetweenDelimiter(result, '<<fadein', '<</fadein>>');
    for (const macro of fadeins) {
        const delayMatch = macro.content.match(/delay="(\d+)">>(.*)/s);
        if (delayMatch) {
            const delay = delayMatch[1];
            const content = delayMatch[2];
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
            const content = timeMatch[2];
            const html = `<span class="delayed" style="animation-delay: ${time}ms;">${content}</span>`;
            result = result.replace(macro.fullMatch, html);
        }
    }
    
    // Parse <<wiggle>>text<</wiggle>>
    const wiggles = extractBetweenDelimiter(result, '<<wiggle>>', '<</wiggle>>');
    for (const macro of wiggles) {
        const letters = macro.content.split('').map(char => {
            if (char === ' ') return ' ';
            const randomDelay = Math.random() * 0.3; // Random delay between 0-0.3s
            const randomDuration = 0.3 + Math.random() * 0.3; // Random duration between 0.3-0.6s
            return `<span style="animation-delay: ${randomDelay}s; animation-duration: ${randomDuration}s;">${char}</span>`;
        }).join('');
        const html = `<span class="wiggle">${letters}</span>`;
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
    
    return result;
}

// Activate typewriter and other JS-based animations
function activateAnimations() {
    // Typewriter effect
    document.querySelectorAll('.typewriter').forEach(elem => {
        if (elem.dataset.animated) return; // Skip if already animated
        elem.dataset.animated = 'true';
        
        const text = elem.dataset.text;
        const speed = parseInt(elem.dataset.speed) || 50;
        let index = 0;
        
        elem.textContent = '';
        elem.style.whiteSpace = 'normal'; // Allow wrapping during typing
        
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

// Preload all passages that can be linked from current text
async function preloadLinkedPassages(parsedText) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = parsedText;
    const links = tempDiv.querySelectorAll('.passage-link');
    
    for (const link of links) {
        const { type, target, group } = link.dataset;
        
        if (type === 'direct') {
            // Preload direct passage
            fetch(getPassagePath(target)).catch(() => {}); // Silent fail, just for cache
        } else if (type === 'group') {
            // Preload manifest for group-based links
            fetch(`./passages/${group}/manifest.json`).catch(() => {});
        }
    }
}

// Helper to construct passage file path
function getPassagePath(passageName) {
    const split = passageName.split("_");
    const groupName = split[0];
    
    if (split[1] === "transition") {
        const transitionFileID = split.slice(2).join("_");
        return `./passages/${groupName}/transitions/${transitionFileID}.md`;
    } else {
        const fileID = split.slice(1).join("_");
        return `./passages/${groupName}/${fileID}.md`;
    }
}

// parse links from the markdown file
export function parseLinks(text, currentPassageName) {
    const links = extractBetweenDelimiter(text, "[[", "]]");
    let result = text;
    const currentGroup = currentPassageName ? currentPassageName.split("_")[0] : '';

    for (const link of links) {
        const [displayText, target] = link.content.split("|").map(part => part.trim());
        const linkText = target ? displayText : link.content;
        let targetValue = target || link.content;
        
        // Check if it's a group-based link (starts with @)
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
            // Direct link - add current group if no group specified
            if (!targetValue.includes("_")) {
                // Just an ID, use current group
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

// Load manifest and select a passage from group
export async function selectPassageFromGroup(groupName) {
    try {
        const manifest = await fetch(`./passages/${groupName}/manifest.json`).then(r => r.json());
        
        // Filter out visited passages
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

// Handle link clicks with transition checking
export async function handleLinkClick(linkElement) {
    const { type, target, group, fromGroup, fromId } = linkElement.dataset;
    
    if (type === "direct") {
        // Direct link - no transitions, just load
        return target;
    } else if (type === "group") {
        // Group-based random selection
        const selectedPassage = await selectPassageFromGroup(group);
        if (!selectedPassage) {
            console.error(`Could not select passage from group "${group}"`);
            return null;
        }
        
        if (fromId && fromGroup) {
            const selectedID = selectedPassage.split("_").slice(1).join("_");
            const transitionFileName = `T-${fromId}-${selectedID}`;
            const transitionPath = `./passages/${fromGroup}/transitions/${transitionFileName}.md`;
            
            try {
                const response = await fetch(transitionPath, { method: 'HEAD' });
                if (response.ok) {
                    return `${fromGroup}_transition_${transitionFileName}`;
                }
            } catch (error) {
                // No transition, fall through
            }
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

// Load starting passage on page load
window.addEventListener('DOMContentLoaded', () => {
    renderPassage('menu_title_screen');
});