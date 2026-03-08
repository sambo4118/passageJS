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

export function extractIfBlockMacros(text) {
    const tokenPattern = /<<if:[^>]*>>|<<\/if>>/g;
    const stack = [];
    const matches = [];
    const startToken = '<<if:';
    const endToken = '<</if>>';

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

// Protect onclick and delayed content from early processing
export function protectOnclickContent(text) {
    const protectedBlocks = [];
    let counter = 0;
    
    // Protect onclick macros
    let result = text;
    const onclickPattern = /<<onclick\b[^>]*>>([\s\S]*?)<<\/onclick>>/g;
    result = result.replace(onclickPattern, (match) => {
        const placeholder = `___ONCLICK_BLOCK_${counter}___`;
        protectedBlocks.push({ placeholder, content: match });
        counter++;
        return placeholder;
    });
    
    // Protect delayed macros
    const delayedPattern = /<<delayed\b[^>]*>>([\s\S]*?)<<\/delayed>>/g;
    result = result.replace(delayedPattern, (match) => {
        const placeholder = `___DELAYED_BLOCK_${counter}___`;
        protectedBlocks.push({ placeholder, content: match });
        counter++;
        return placeholder;
    });
    
    return { text: result, protectedBlocks };
}

export function restoreOnclickContent(text, protectedBlocks) {
    let result = text;
    for (const block of protectedBlocks) {
        result = result.replace(block.placeholder, block.content);
    }
    return result;
}

// Variable macro parser
export function parseVariables(text, context, extractBetweenDelimiter) {
    let result = text;
    
    // Parse <<var:varname attribute="value">>content<</var>>
    const varMacros = extractBetweenDelimiter(result, '<<var:', '<</var>>');
    
    for (const macro of varMacros) {
        // Extract variable name and attributes from content before >>
        const match = macro.content.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)((?:\s+[a-zA-Z_-]+="[^"]*")*)\s*>>([\s\S]*)$/);
        
        if (!match) continue;
        
        const varName = match[1];
        const attributesStr = match[2];
        const value = match[3].trim();
        
        // Parse attributes
        const attributes = {};
        const attrPattern = /([a-zA-Z_-]+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrPattern.exec(attributesStr)) !== null) {
            attributes[attrMatch[1]] = attrMatch[2];
        }
        
        // Initialize context.state if not exists
        if (!context.state) {
            context.state = {};
        }
        if (!context.state.variables) {
            context.state.variables = {};
        }
        
        // Process the value based on type attribute if specified
        let processedValue = value;
        if (attributes.type === 'number') {
            processedValue = parseFloat(value);
            if (isNaN(processedValue)) {
                processedValue = attributes.default ? parseFloat(attributes.default) : 0;
            }
        } else if (attributes.type === 'boolean') {
            processedValue = value.toLowerCase() === 'true';
        } else if (attributes.type === 'json') {
            try {
                processedValue = JSON.parse(value);
            } catch (e) {
                processedValue = attributes.default ? JSON.parse(attributes.default) : null;
            }
        }
        // Default: store as string
        
        // Store variable in context
        context.state.variables[varName] = processedValue;
        
        // Store any metadata
        if (Object.keys(attributes).length > 0) {
            if (!context.state.variableMetadata) {
                context.state.variableMetadata = {};
            }
            context.state.variableMetadata[varName] = attributes;
        }
        
        // Replace macro with empty string (it's a side-effect macro)
        result = result.replace(macro.fullMatch, '');
    }
    
    return result;
}

// HTML escape helper for safe variable substitution
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, char => map[char]);
}

export function parseVariablesAndSubstitutions(text, context, extractBetweenDelimiter) {
    if (!context.state) {
        context.state = {};
    }
    if (!context.state.variables) {
        context.state.variables = {};
    }
    
    let result = text;
    let changed = true;
    
    // Keep processing until no more changes occur
    while (changed) {
        changed = false;
        
        // Find the first variable declaration
        const varMatch = result.match(/<<var:([a-zA-Z_$][a-zA-Z0-9_$]*)((?:\s+[a-zA-Z_-]+="[^"]*")*)\s*>>([\s\S]*?)<<\/var>>/);
        // Find the first variable substitution
        const subMatch = result.match(/\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/);
        
        const varIndex = varMatch ? result.indexOf(varMatch[0]) : -1;
        const subIndex = subMatch ? result.indexOf(subMatch[0]) : -1;
        
        // Process whichever comes first
        if (varIndex !== -1 && (subIndex === -1 || varIndex < subIndex)) {
            // Process variable declaration
            const varName = varMatch[1];
            const attributesStr = varMatch[2];
            let value = varMatch[3].trim();
            
            // Parse attributes
            const attributes = {};
            const attrPattern = /([a-zA-Z_-]+)="([^"]*)"/g;
            let attrMatch;
            while ((attrMatch = attrPattern.exec(attributesStr)) !== null) {
                attributes[attrMatch[1]] = attrMatch[2];
            }
            
            // First, substitute any variables in the value
            const valueWithVars = value.replace(/\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, (match, vName) => {
                if (vName in context.state.variables) {
                    return String(context.state.variables[vName]);
                }
                return match;
            });
            
            // Then, evaluate any calculations in the value
            const calcPattern = /<<calc>>([\s\S]*?)<<\/calc>>/g;
            let processedValueStr = valueWithVars;
            processedValueStr = processedValueStr.replace(calcPattern, (match, expr) => {
                // Do variable substitution in the calc expression too
                const exprWithVars = expr.replace(/\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, (m, v) => {
                    return (v in context.state.variables) ? String(context.state.variables[v]) : m;
                });
                const result = evaluateSafeMathExpression(exprWithVars.trim());
                return result !== null ? String(result) : match;
            });
            
            // Finally, process the value based on type attribute
            let processedValue = processedValueStr;
            if (attributes.type === 'number') {
                processedValue = parseFloat(processedValueStr);
                if (isNaN(processedValue)) {
                    processedValue = attributes.default ? parseFloat(attributes.default) : 0;
                }
            } else if (attributes.type === 'boolean') {
                processedValue = processedValueStr.toLowerCase() === 'true';
            } else if (attributes.type === 'json') {
                try {
                    processedValue = JSON.parse(processedValueStr);
                } catch (e) {
                    processedValue = attributes.default ? JSON.parse(attributes.default) : null;
                }
            }
            
            // Store variable in context
            context.state.variables[varName] = processedValue;
            
            // Store metadata
            if (Object.keys(attributes).length > 0) {
                if (!context.state.variableMetadata) {
                    context.state.variableMetadata = {};
                }
                context.state.variableMetadata[varName] = attributes;
            }
            
            // Remove the declaration from text
            result = result.replace(varMatch[0], '');
            changed = true;
            
        } else if (subIndex !== -1) {
            // Process variable substitution
            const varName = subMatch[1];
            
            if (varName in context.state.variables) {
                const value = context.state.variables[varName];
                let displayValue;
                
                if (typeof value === 'object') {
                    displayValue = escapeHtml(JSON.stringify(value));
                } else {
                    displayValue = escapeHtml(String(value));
                }
                
                // Replace with a span that can be dynamically updated
                const replacement = `<span class="var-display" data-var="${varName}">${displayValue}</span>`;
                result = result.replace(subMatch[0], replacement);
            } else {
                // Variable doesn't exist, leave it unchanged
                // Replace with a placeholder to avoid infinite loop
                result = result.replace(subMatch[0], `\x00VARSUBST:${varName}\x00`);
            }
            changed = true;
        }
    }
    
    // Restore any unresolved variable references
    result = result.replace(/\x00VARSUBST:([^>]+)\x00/g, '${$1}');
    
    return result;
}

// Variable substitution parser - replaces ${varname} with variable values
export function substituteVariables(text, context) {
    if (!context.state || !context.state.variables) {
        return text;
    }
    
    let result = text;
    const varPattern = /\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;
    
    result = result.replace(varPattern, (match, varName) => {
        if (varName in context.state.variables) {
            const value = context.state.variables[varName];
            let displayValue;
            
            if (typeof value === 'object') {
                displayValue = escapeHtml(JSON.stringify(value));
            } else {
                displayValue = escapeHtml(String(value));
            }
            
            // Return a span that can be dynamically updated
            return `<span class="var-display" data-var="${varName}">${displayValue}</span>`;
        }
        // If variable doesn't exist, leave the pattern unchanged
        return match;
    });
    
    return result;
}

// Calculation macro parser - <<calc>>expression<</calc>>
export function parseCalculations(text, context, extractBetweenDelimiter) {
    let result = text;
    
    const calcMacros = extractBetweenDelimiter(result, '<<calc>>', '<</calc>>');
    
    for (const macro of calcMacros) {
        const expression = macro.content.trim();
        
        try {
            // Substitute variables in the expression first
            let exprWithVars = expression;
            if (context && context.state && context.state.variables) {
                exprWithVars = expression.replace(/\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, (match, varName) => {
                    if (varName in context.state.variables) {
                        return String(context.state.variables[varName]);
                    }
                    return match;
                });
            }
            
            // Safe math expression evaluation
            const calculatedValue = evaluateSafeMathExpression(exprWithVars);
            
            // Replace the macro with the calculated result
            result = result.replace(macro.fullMatch, String(calculatedValue));
        } catch (error) {
            // If evaluation fails, leave it as-is or show error
            console.error('Calculation error:', error, 'Expression:', expression);
            result = result.replace(macro.fullMatch, `[calc error: ${expression}]`);
        }
    }
    
    return result;
}

// Safe math expression evaluator - only allows math operations
function evaluateSafeMathExpression(expr) {
    // Remove whitespace
    const cleaned = expr.replace(/\s+/g, '');
    
    // Whitelist: only allow numbers, basic operators, parentheses, dots for decimals,
    // and safe Math functions
    const allowedPattern = /^[0-9+\-*/.()&|<>=!%\s]+$/;
    const mathFunctionPattern = /Math\.(abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|max|min|pow|random|round|sin|sqrt|tan|PI|E)/g;
    const dateFunctionPattern = /Date\.now\(\)/g;
    
    // Check for disallowed characters (excluding Math and Date functions temporarily)
    let testExpr = expr.replace(mathFunctionPattern, '');
    testExpr = testExpr.replace(dateFunctionPattern, '');
    
    // Remove numbers (including decimals and scientific notation)
    testExpr = testExpr.replace(/[0-9.eE+\-]/g, '');
    
    // Remove operators and parentheses
    testExpr = testExpr.replace(/[+\-*/%()[\]<>=!&|]/g, '');
    
    // Remove whitespace
    testExpr = testExpr.replace(/\s+/g, '');
    
    // After removing all allowed content, only 'Math', 'Date' and function names should remain
    testExpr = testExpr.replace(/Math/g, '');
    testExpr = testExpr.replace(/Date/g, '');
    testExpr = testExpr.replace(/now/g, '');
    testExpr = testExpr.replace(/(abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|max|min|pow|random|round|sin|sqrt|tan|PI|E)/g, '');
    
    // If anything else remains, it's potentially dangerous
    if (testExpr.length > 0) {
        throw new Error('Expression contains disallowed characters or functions');
    }
    
    // Additional safety: block common injection patterns
    if (/(\bfunction\b|=>|\beval\b|\bconstructor\b|\bwindow\b|\bdocument\b|\blocalStorage\b|\bimport\b|\brequire\b)/i.test(expr)) {
        throw new Error('Expression contains disallowed keywords');
    }
    
    // Create a sandboxed evaluation context with Math and Date available
    const sandboxedFunction = new Function('Math', 'Date', 'return (' + expr + ')');
    return sandboxedFunction(Math, Date);
}

// Conditional macro parser - <<if:varname comparison value>>content<</if>>
export function parseConditionals(text, context, depth, renderBlockAwareMacroBody) {
    let result = text;

    while (true) {
        const ifMacros = extractIfBlockMacros(result);
        if (ifMacros.length === 0) break;

        // Process from rightmost (innermost) to leftmost
        const macro = ifMacros.reduce((rightmost, current) => {
            return current.index > rightmost.index ? current : rightmost;
        });

        const partsMatch = macro.content.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s+(.*?)>>([\s\S]*)$/);
        if (!partsMatch) {
            // Invalid syntax, remove the macro
            const before = result.slice(0, macro.index);
            const after = result.slice(macro.index + macro.fullMatch.length);
            result = `${before}${after}`;
            continue;
        }

        const varName = partsMatch[1];
        const conditionExpression = partsMatch[2].trim();
        const body = partsMatch[3];

        // Get variable value
        let varValue = null;
        if (context.state && context.state.variables && varName in context.state.variables) {
            varValue = context.state.variables[varName];
        }

        // Evaluate condition
        let conditionResult = false;
        try {
            // Parse the condition expression to extract operator and comparison value
            // Support text-based operators to avoid HTML conflicts with < and >
            const comparisonMatch = conditionExpression.match(/^(equals|is|not equals|is not|less than or equal|at most|greater than or equal|at least|less than|greater than)\s+(.+)$/i);
            
            if (comparisonMatch) {
                const operator = comparisonMatch[1].toLowerCase();
                const compareValueStr = comparisonMatch[2].trim();
                
                // Parse the comparison value
                let compareValue;
                if (compareValueStr === 'true') {
                    compareValue = true;
                } else if (compareValueStr === 'false') {
                    compareValue = false;
                } else if (compareValueStr === 'null') {
                    compareValue = null;
                } else if (compareValueStr === 'undefined') {
                    compareValue = undefined;
                } else if (/^["'].*["']$/.test(compareValueStr)) {
                    // String literal
                    compareValue = compareValueStr.slice(1, -1);
                } else if (!isNaN(compareValueStr)) {
                    // Number
                    compareValue = parseFloat(compareValueStr);
                } else {
                    // Try as string
                    compareValue = compareValueStr;
                }
                
                // Perform comparison based on text operator
                switch (operator) {
                    case 'equals':
                    case 'is':
                        conditionResult = varValue === compareValue;
                        break;
                    case 'not equals':
                    case 'is not':
                        conditionResult = varValue !== compareValue;
                        break;
                    case 'less than':
                        conditionResult = varValue < compareValue;
                        break;
                    case 'greater than':
                        conditionResult = varValue > compareValue;
                        break;
                    case 'less than or equal':
                    case 'at most':
                        conditionResult = varValue <= compareValue;
                        break;
                    case 'greater than or equal':
                    case 'at least':
                        conditionResult = varValue >= compareValue;
                        break;
                }
            }
        } catch (error) {
            console.error('Conditional evaluation error:', error);
            conditionResult = false;
        }

        // Render content based on condition
        let replacement = '';
        if (conditionResult) {
            const { html: innerHTML, useBlockMarkdown } = renderBlockAwareMacroBody(body, context, depth);
            replacement = innerHTML;
        }

        const before = result.slice(0, macro.index);
        const after = result.slice(macro.index + macro.fullMatch.length);
        result = `${before}${replacement}${after}`;
    }

    return result;
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
            const rawContent = timeMatch[2];
            const delayedId = `delayed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Store raw content base64 encoded
            const encodedContent = btoa(encodeURIComponent(rawContent));
            
            const html = `<div id="${delayedId}" class="delayed" data-content="${encodedContent}" style="animation-delay: ${time}ms;"></div><script>setTimeout(function() { var elem = document.getElementById('${delayedId}'); var content = decodeURIComponent(atob(elem.getAttribute('data-content'))); window.renderDynamicContent('${delayedId}', content); }, ${time});</script>`;
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
            const currentId = `onclick-reveal-${runtimeState.onclickRevealCounter++}`;
            const autoReveal = !hasTriggerText;

            // Store raw content in a data attribute (base64 encoded to avoid escaping issues)
            const encodedBody = btoa(encodeURIComponent(body));

            // Build onclick code that processes markup dynamically
            let onclickCode = `var content = decodeURIComponent(atob(this.getAttribute('data-content'))); window.renderDynamicContent('${currentId}', content); document.getElementById('${currentId}').style.display='block'; this.style.display='none';`;
            if (hasAction) {
                onclickCode += ` try { ${action} } catch (error) { console.error('Onclick action failed:', error); }`;
            }

            const clickLabel = hasTriggerText ? parseInlineMarkdown(triggerText) : '';
            const triggerStyle = hasTriggerText
                ? 'cursor: pointer; text-decoration: underline;'
                : 'display: none;';
            replacementHTML = `<span id="${currentId}-trigger" class="clickable-text onclick-reveal-trigger" data-auto="${autoReveal}" data-content="${encodedBody}" onclick="${onclickCode}" style="${triggerStyle}">${clickLabel}</span><div id="${currentId}" style="display: none;"></div>`;
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
