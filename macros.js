// Macro parsing and animation functions for PassageJS

// Extract block-level macros with proper nesting support
export function extractTextColorBlockMacros(text) {
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

export function extractOnclickMacros(text) {
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

// Helper to determine if content should be rendered as block or inline
export function parseBlockMarkdown(raw) {
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/m.test(raw)) return true;
    if (/^\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|~~~)/m.test(raw)) return true;
    if (/\n\s*\n/.test(raw)) return true;
    return false;
}

// Parse inline markdown
export function parseInlineMarkdown(text) {
    if (window.marked) {
        return window.marked.parseInline(text);
    }
    return text;
}

// Background color macro parser
export function parseBackgroundColor(text) {
    const bgPattern = /<<bgcolor\s+color=["']([^"']+)["']\s*>>/g;
    let foundColor = false;
    
    text = text.replace(bgPattern, (match, color) => {
        document.body.style.backgroundColor = color;
        foundColor = true;
        return '';
    });
    
    if (!foundColor) {
        document.body.style.backgroundColor = '#101114';
    }
    
    return text;
}

// Text color macro parser
export function parseTextColor(text, context, depth, renderBlockAwareMacroBody, extractBetweenDelimiter) {
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

// Animation macros parser
export function parseAnimations(text, context, depth, renderInlineMacroBody, renderBlockAwareMacroBody, extractBetweenDelimiter) {
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
            const processedContent = renderInlineMacroBody(content, context, depth);
            const html = `<span class="typewriter" data-speed="${speed}" data-html="${processedContent.replace(/"/g, '&quot;')}"></span>`;
            result = result.replace(macro.fullMatch, html);
        }
    }
    
    // Parse <<hop speed="100">>text<</hop>> or <<hop>>text<</hop>>
    const hops = extractBetweenDelimiter(result, '<<hop', '<</hop>>');   
    for (const macro of hops) {
        const speedMatch = macro.content.match(/speed="(\d+)">>(.*)/s);
        let speed = 100;
        let textContent = macro.content;
        
        if (speedMatch) {
            speed = parseInt(speedMatch[1]);
            textContent = speedMatch[2];
        } else if (macro.content.startsWith('>>')) {
            textContent = macro.content.slice(2);
        }
        
        const htmlContent = renderInlineMacroBody(textContent, context, depth);
        
        const decodedContent = htmlContent
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&');
        
        const parts = decodedContent.split(/(<[^>]+>)/);
        
        let charIndex = 0;
        const processedParts = parts.map(part => {
            if (part.startsWith('<')) {
                return part;
            }
            return part.split('').map(char => {
                if (char === ' ') return ' ';
                const delay = charIndex * (speed / 1000);
                charIndex++;
                return `<span style="animation-delay: ${delay}s;">${char}</span>`;
            }).join('');
        });
        
        const html = `<span class="hop">${processedParts.join('')}</span>`;
        result = result.replace(macro.fullMatch, html);
    } 
    
    // Parse <<wave speed="100">>text<</wave>> or <<wave>>text<</wave>>
    const waves = extractBetweenDelimiter(result, '<<wave', '<</wave>>');
    for (const macro of waves) {
        const speedMatch = macro.content.match(/speed="(\d+)">>(.*)/s);
        let speed = 100;
        let textContent = macro.content;
        
        if (speedMatch) {
            speed = parseInt(speedMatch[1]);
            textContent = speedMatch[2];
        } else if (macro.content.startsWith('>>')) {
            textContent = macro.content.slice(2);
        }
        
        const htmlContent = renderInlineMacroBody(textContent, context, depth);
        
        const decodedContent = htmlContent
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&');
        
        const parts = decodedContent.split(/(<[^>]+>)/);
        
        let charIndex = 0;
        const processedParts = parts.map(part => {
            if (part.startsWith('<')) {
                return part;
            }
            return part.split('').map(char => {
                if (char === ' ') return ' ';
                const delay = charIndex * (speed / 1000);
                charIndex++;
                return `<span style="animation-delay: ${delay}s;">${char}</span>`;
            }).join('');
        });
        
        const html = `<span class="wave">${processedParts.join('')}</span>`;
        result = result.replace(macro.fullMatch, html);
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

            let onclickCode = `var el = document.getElementById('${currentId}'); el.style.display='${displayType}'; this.style.display='none'; el.querySelectorAll('.typewriter').forEach(function(tw) { delete tw.dataset.animated; }); el.querySelectorAll('.fade-in, .delayed').forEach(function(elem) { var clone = elem.cloneNode(true); elem.parentNode.replaceChild(clone, elem); }); window.activateAnimations();`;
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

// Helper function to get inherited animation delay from parent elements
export function getInheritedAnimationDelay(element) {
    let maxDelay = 0;
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
        const animDelay = parent.style.animationDelay;
        if (animDelay) {
            maxDelay = Math.max(maxDelay, parseInt(animDelay) || 0);
        }
        parent = parent.parentElement;
    }
    return maxDelay;
}

// Activate typewriter animations
export function activateAnimations() {
    document.querySelectorAll('.typewriter').forEach(elem => {
        if (elem.dataset.animated) return; 
        elem.dataset.animated = 'true';
        
        const htmlContent = elem.dataset.html;
        const speed = parseInt(elem.dataset.speed) || 50;
        const startDelay = getInheritedAnimationDelay(elem);
        
        setTimeout(() => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            elem.innerHTML = tempDiv.innerHTML;
            elem.style.whiteSpace = 'normal';
            
            const textNodes = [];
            const walker = document.createTreeWalker(
                elem,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.trim().length > 0) {
                    textNodes.push({
                        node: node,
                        fullText: node.textContent,
                        currentIndex: 0
                    });
                    node.textContent = '';
                }
            }
            
            let currentNodeIndex = 0;
            
            const interval = setInterval(() => {
                if (currentNodeIndex >= textNodes.length) {
                    clearInterval(interval);
                    return;
                }
                
                const currentTextNode = textNodes[currentNodeIndex];
                
                if (currentTextNode.currentIndex < currentTextNode.fullText.length) {
                    currentTextNode.node.textContent += currentTextNode.fullText[currentTextNode.currentIndex];
                    currentTextNode.currentIndex++;
                } else {
                    currentNodeIndex++;
                }
            }, speed);
        }, startDelay);
    });
}
