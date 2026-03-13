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
    const tokenPattern = /<<if [^>]*>>|<<\/if>>/g;
    const stack = [];
    const matches = [];
    const startToken = '<<if ';
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

export function extractRandomBlockMacros(text) {
    const tokenPattern = /<<random\b[^>]*>>|<<\/random>>/g;
    const stack = [];
    const matches = [];
    const endToken = '<</random>>';

    for (const token of text.matchAll(tokenPattern)) {
        const tokenText = token[0];
        const tokenIndex = token.index;

        if (tokenText.startsWith('<<random')) {
            stack.push({ index: tokenIndex });
            continue;
        }

        if (stack.length === 0) continue;

        const open = stack.pop();
        const fullMatch = text.slice(open.index, tokenIndex + endToken.length);
        // content includes the attributes portion and the body
        matches.push({
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

// Protect if blocks from early variable processing.
export function protectIfContent(text) {
    const protectedBlocks = [];
    let counter = 0;
    let result = text;

    while (true) {
        const ifBlocks = extractIfBlockMacros(result);
        if (ifBlocks.length === 0) break;

        const macro = ifBlocks.reduce((rightmost, current) => {
            return current.index > rightmost.index ? current : rightmost;
        });

        const placeholder = `___IF_BLOCK_${counter}___`;
        protectedBlocks.push({ placeholder, content: macro.fullMatch });
        result = `${result.slice(0, macro.index)}${placeholder}${result.slice(macro.index + macro.fullMatch.length)}`;
        counter++;
    }

    return { text: result, protectedBlocks };
}

export function restoreIfContent(text, protectedBlocks) {
    let result = text;
    for (const block of protectedBlocks) {
        result = result.replace(block.placeholder, block.content);
    }
    return result;
}

// Variable macro parser
export function parseVariables(text, context, extractBetweenDelimiter) {
    let result = text;
    
    // Parse <<var varname attribute="value">>content<</var>>
    const varMacros = extractBetweenDelimiter(result, '<<var ', '<</var>>');
    
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
    
    // Protect calc macro contents from variable substitution wrapping
    // Extract calc macros and replace with placeholders
    const calcMacros = [];
    result = result.replace(/<<calc>>([\s\S]*?)<<\/calc>>/g, (match, content, offset) => {
        const placeholder = `\x00CALC_PROTECTED_${calcMacros.length}\x00`;
        calcMacros.push(match);
        return placeholder;
    });
    
    let changed = true;
    
    // Keep processing until no more changes occur
    while (changed) {
        changed = false;
        
        // Find the first variable declaration
        const varMatch = result.match(/<<var ([a-zA-Z_$][a-zA-Z0-9_$]*)((?:\s+[a-zA-Z_-]+="[^"]*")*)\s*>>([\s\S]*?)<<\/var>>/);
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
            
            // Restore any protected calc macros in the value
            value = value.replace(/\x00CALC_PROTECTED_(\d+)\x00/g, (match, index) => {
                return calcMacros[parseInt(index)] || match;
            });
            
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
    
    // Restore protected calc macros
    result = result.replace(/\x00CALC_PROTECTED_(\d+)\x00/g, (match, index) => {
        return calcMacros[parseInt(index)];
    });
    
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
            
            // Wrap in a span that can be dynamically re-evaluated
            const encodedExpr = btoa(encodeURIComponent(expression));
            const replacement = `<span class="calc-display" data-expr="${encodedExpr}">${String(calculatedValue)}</span>`;
            
            // Replace the macro with the calculated result
            result = result.replace(macro.fullMatch, replacement);
        } catch (error) {
            // If evaluation fails, leave it as-is or show error
            console.error('Calculation error:', error, 'Expression:', expression);
            result = result.replace(macro.fullMatch, `[calc error: ${expression}]`);
        }
    }
    
    return result;
}

// Safe math expression evaluator - only allows math operations
export function evaluateSafeMathExpression(expr) {
    // Remove whitespace

    const mathFunctionPattern = /Math\.(abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|max|min|pow|random|round|sin|sqrt|tan|PI|E)/g;
    const dateFunctionPattern = /Date\.now\(\)/g;
    
    // Check for disallowed characters (excluding Math and Date functions temporarily)
    let testExpr = expr.replace(mathFunctionPattern, '');
    testExpr = testExpr.replace(dateFunctionPattern, '');
    
    // Remove numbers (including decimals and scientific notation)
    testExpr = testExpr.replace(/[0-9.eE+\-]/g, '');
    
    // Remove operators, parentheses, and commas (for function arguments)
    testExpr = testExpr.replace(/[+\-*/%()[\]<>=!&|,]/g, '');
    
    // Remove whitespace
    testExpr = testExpr.replace(/\s+/g, '');
    
    // After removing all allowed content, only 'Math', 'Date' and function names should remain
    testExpr = testExpr.replace(/Math/g, '');
    testExpr = testExpr.replace(/Date/g, '');
    testExpr = testExpr.replace(/now/g, '');
    testExpr = testExpr.replace(/(abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|max|min|pow|random|round|sin|sqrt|tan|PI|E)/g, '');
    
    if (testExpr.length > 0) {
        throw new Error('Expression contains disallowed characters or functions');
    }
    
    if (/(\bfunction\b|=>|\beval\b|\bconstructor\b|\bwindow\b|\bdocument\b|\blocalStorage\b|\bimport\b|\brequire\b)/i.test(expr)) {
        throw new Error('Expression contains disallowed keywords');
    }
    
    const sandboxedFunction = new Function('Math', 'Date', 'return (' + expr + ')');
    return sandboxedFunction(Math, Date);
}

export function parseConditionals(text, context, depth, renderBlockAwareMacroBody) {
    let result = text;
    const truthyConditionToken = '__truthy__';
    const negationTokenPrefix = '__negate__:';

    while (true) {
        const ifMacros = extractIfBlockMacros(result);
        if (ifMacros.length === 0) break;

        // Process from rightmost (innermost) to leftmost
        const macro = ifMacros.reduce((rightmost, current) => {
            return current.index > rightmost.index ? current : rightmost;
        });

        const partsMatch = macro.content.match(/^\s*(not\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+(.*?))?>>([\s\S]*)$/i);
        if (!partsMatch) {
            // Invalid syntax, remove the macro
            const before = result.slice(0, macro.index);
            const after = result.slice(macro.index + macro.fullMatch.length);
            result = `${before}${after}`;
            continue;
        }

        const negateResult = Boolean(partsMatch[1]);
        const varName = partsMatch[2];
        const conditionExpression = (partsMatch[3] || '').trim();
        const body = partsMatch[4];

        // Get variable value
        let varValue = null;
        if (context.state && context.state.variables && varName in context.state.variables) {
            varValue = context.state.variables[varName];
        }

        // Evaluate condition
        let conditionResult = false;
        try {
            const evaluateSingleComparison = (rawExpression) => {
                const expression = String(rawExpression || '').trim();
                if (!expression) {
                    return Boolean(varValue);
                }

                const comparisonMatch = expression.match(/^(equals|is|not equals|is not|less than or equal|at most|greater than or equal|at least|less than|greater than)\s+(.+)$/i);
                if (!comparisonMatch) {
                    return false;
                }

                const operator = comparisonMatch[1].toLowerCase();
                const compareValueStr = comparisonMatch[2].trim();

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
                    compareValue = compareValueStr.slice(1, -1);
                } else if (!isNaN(compareValueStr)) {
                    compareValue = parseFloat(compareValueStr);
                } else {
                    compareValue = compareValueStr;
                }

                switch (operator) {
                    case 'equals':
                    case 'is':
                        return varValue === compareValue;
                    case 'not equals':
                    case 'is not':
                        return varValue !== compareValue;
                    case 'less than':
                        return varValue < compareValue;
                    case 'greater than':
                        return varValue > compareValue;
                    case 'less than or equal':
                    case 'at most':
                        return varValue <= compareValue;
                    case 'greater than or equal':
                    case 'at least':
                        return varValue >= compareValue;
                    default:
                        return false;
                }
            };

            if (!conditionExpression) {
                conditionResult = Boolean(varValue);
            } else {
                const parts = conditionExpression.split(/\s+(and|or)\s+/i).map(part => part.trim()).filter(Boolean);

                if (parts.length === 0) {
                    conditionResult = false;
                } else if (parts.length === 1) {
                    conditionResult = evaluateSingleComparison(parts[0]);
                } else {
                    let runningResult = evaluateSingleComparison(parts[0]);
                    for (let i = 1; i < parts.length; i += 2) {
                        const connector = (parts[i] || '').toLowerCase();
                        const nextCondition = parts[i + 1] || '';
                        const nextResult = evaluateSingleComparison(nextCondition);

                        if (connector === 'and') {
                            runningResult = runningResult && nextResult;
                        } else if (connector === 'or') {
                            runningResult = runningResult || nextResult;
                        } else {
                            runningResult = false;
                            break;
                        }
                    }
                    conditionResult = runningResult;
                }
            }

            if (negateResult) {
                conditionResult = !conditionResult;
            }
        } catch (error) {
            console.error('Conditional evaluation error:', error);
            conditionResult = false;
        }

        const conditionPayload = `${negateResult ? negationTokenPrefix : ''}${conditionExpression || truthyConditionToken}`;
        const encodedOperator = btoa(conditionPayload);

        let innerHTML = '';
        let useBlockMarkdown = false;
        if (conditionResult) {
            const rendered = renderBlockAwareMacroBody(body, context, depth);
            innerHTML = rendered.html;
            useBlockMarkdown = rendered.useBlockMarkdown;
        }

        const displayStyle = conditionResult ? '' : 'display: none;';
        
        const tagName = useBlockMarkdown ? 'div' : 'span';
        const replacement = `<${tagName} class="conditional" data-var="${varName}" data-condition="${encodedOperator}" style="${displayStyle}">${innerHTML}</${tagName}>`;

        const before = result.slice(0, macro.index);
        const after = result.slice(macro.index + macro.fullMatch.length);
        result = `${before}${replacement}${after}`;
    }

    return result;
}

// Random macro parser
// Supports: <<random odds="50%">>content<</random>>
//           <<random odds="3/10">>content<</random>>
export function parseRandom(text, context, depth, renderBlockAwareMacroBody) {
    let result = text;

    while (true) {
        const macros = extractRandomBlockMacros(result);
        if (macros.length === 0) break;

        const macro = macros.reduce((rightmost, current) => {
            return current.index > rightmost.index ? current : rightmost;
        });

        // Parse the opening tag to extract odds attribute
        const tagMatch = macro.fullMatch.match(/^<<random\s+odds\s*=\s*"([^"]+)"\s*>>/i);
        if (!tagMatch) {
            // Invalid syntax, remove the macro
            const before = result.slice(0, macro.index);
            const after = result.slice(macro.index + macro.fullMatch.length);
            result = `${before}${after}`;
            continue;
        }

        const oddsStr = tagMatch[1].trim();
        const body = macro.fullMatch.slice(tagMatch[0].length, macro.fullMatch.length - '<</random>>'.length);

        // Parse odds value into a probability 0-1
        let probability = 0;
        const percentMatch = oddsStr.match(/^(\d+(?:\.\d+)?)\s*%$/);
        const fractionMatch = oddsStr.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);

        if (percentMatch) {
            probability = parseFloat(percentMatch[1]) / 100;
        } else if (fractionMatch) {
            const denominator = parseFloat(fractionMatch[2]);
            if (denominator !== 0) {
                probability = parseFloat(fractionMatch[1]) / denominator;
            }
        }

        // Clamp to 0-1
        probability = Math.max(0, Math.min(1, probability));

        // Use the seeded RNG from context if available, otherwise Math.random
        const roll = context.rng ? context.rng.next() : Math.random();
        const show = roll < probability;

        let replacement = '';
        if (show) {
            const { html: innerHTML, useBlockMarkdown } = renderBlockAwareMacroBody(body, context, depth);
            const tagName = useBlockMarkdown ? 'div' : 'span';
            replacement = `<${tagName} class="random-content">${innerHTML}</${tagName}>`;
        }

        const before = result.slice(0, macro.index);
        const after = result.slice(macro.index + macro.fullMatch.length);
        result = `${before}${replacement}${after}`;
    }

    return result;
}

// Background color macro parser
export function parseBackgroundColor(text) {
    const applyBackgroundImageValue = (value) => {
        if (value instanceof HTMLCanvasElement) {
            document.body.style.backgroundImage = `url("${value.toDataURL('image/png')}")`;
            return true;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return false;

            if (/^url\(/i.test(trimmed) || /^linear-gradient\(/i.test(trimmed) || /^radial-gradient\(/i.test(trimmed)) {
                document.body.style.backgroundImage = trimmed;
            } else {
                const safeImagePath = trimmed.replace(/"/g, '\\"');
                document.body.style.backgroundImage = `url("${safeImagePath}")`;
            }

            return true;
        }

        if (value && typeof value === 'object') {
            const imageValue = typeof value.image === 'string' ? value.image.trim() : '';
            if (!imageValue) return false;

            if (/^url\(/i.test(imageValue) || /^linear-gradient\(/i.test(imageValue) || /^radial-gradient\(/i.test(imageValue)) {
                document.body.style.backgroundImage = imageValue;
            } else {
                const safeImagePath = imageValue.replace(/"/g, '\\"');
                document.body.style.backgroundImage = `url("${safeImagePath}")`;
            }

            if (typeof value.size === 'string') document.body.style.backgroundSize = value.size;
            if (typeof value.position === 'string') document.body.style.backgroundPosition = value.position;
            if (typeof value.repeat === 'string') document.body.style.backgroundRepeat = value.repeat;

            return true;
        }

        return false;
    };

    const loadScriptGenerator = async (scriptPath) => {
        if (!scriptPath) return null;

        if (!window.passageBackgroundScriptCache) {
            window.passageBackgroundScriptCache = {};
        }

        if (window.passageBackgroundScriptCache[scriptPath]) {
            return window.passageBackgroundScriptCache[scriptPath];
        }

        try {
            const resolvedUrl = new URL(scriptPath, window.location.href).href;
            const moduleExports = await import(resolvedUrl);
            const generator = moduleExports.default || moduleExports.generateBackground;

            if (typeof generator !== 'function') {
                console.warn(`Background script '${scriptPath}' must export a default function or 'generateBackground'.`);
                return null;
            }

            window.passageBackgroundScriptCache[scriptPath] = generator;
            return generator;
        } catch (error) {
            console.error(`Failed to load background script '${scriptPath}':`, error);
            return null;
        }
    };

    const runScriptBackground = (scriptPath, attributes, requestId) => {
        if (!scriptPath) return;

        void loadScriptGenerator(scriptPath).then((generator) => {
            if (typeof generator !== 'function') return;
            if (window.passageBackgroundRequestId !== requestId) return;

            const api = {
                width: window.innerWidth,
                height: window.innerHeight,
                dpr: window.devicePixelRatio || 1,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    dpr: window.devicePixelRatio || 1
                },
                attributes,
                createCanvas(width = window.innerWidth, height = window.innerHeight) {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    return canvas;
                }
            };

            try {
                const result = generator(api);
                if (result == null) return;
                if (window.passageBackgroundRequestId !== requestId) return;
                applyBackgroundImageValue(result);
            } catch (error) {
                console.error(`Background script failed '${scriptPath}':`, error);
            }
        });
    };

    const backgroundPattern = /<<background\b([^>]*)>>/g;
    let foundBackground = false;

    text = text.replace(backgroundPattern, (match, attrs) => {
        const attributes = {};
        const attrPattern = /([a-zA-Z_-]+)\s*=\s*["']([^"']*)["']/g;
        let attrMatch;

        while ((attrMatch = attrPattern.exec(attrs)) !== null) {
            attributes[attrMatch[1].toLowerCase()] = attrMatch[2];
        }

        if (attributes.color) {
            document.body.style.backgroundColor = attributes.color;
        }

        if (typeof window.passageBackgroundRequestId !== 'number') {
            window.passageBackgroundRequestId = 0;
        }

        const currentRequestId = ++window.passageBackgroundRequestId;

        if (attributes.img) {
            const safeImagePath = attributes.img.replace(/"/g, '\\"');
            document.body.style.backgroundImage = `url("${safeImagePath}")`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center center';
            document.body.style.backgroundRepeat = 'no-repeat';
        }

        if (attributes.script) {
            runScriptBackground(attributes.script, attributes, currentRequestId);
        }

        if (!attributes.img && !attributes.script) {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundRepeat = '';
        }

        if (!attributes.img && attributes.script) {
            // Keep script-driven textures stable if only color/script are provided.
            if (!document.body.style.backgroundSize) document.body.style.backgroundSize = 'cover';
            if (!document.body.style.backgroundPosition) document.body.style.backgroundPosition = 'center center';
            if (!document.body.style.backgroundRepeat) document.body.style.backgroundRepeat = 'no-repeat';
        }

        foundBackground = true;
        return '';
    });

    if (!foundBackground) {
        return text;
    }

    return text;
}

// Title macro parser
export function parseTitle(text) {
    const titlePattern = /<<title>>([\s\S]*?)<<\/title>>/g;
    let lastTitle = null;

    text = text.replace(titlePattern, (_match, content) => {
        lastTitle = content.trim();
        return '';
    });

    if (lastTitle !== null) {
        document.title = lastTitle;
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

    const parseBooleanAttribute = (value) => {
        if (typeof value !== 'string') return false;
        return /^(true|1|yes|on)$/i.test(value.trim());
    };

    const coerceBooleanValue = (value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
            if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
        }
        return Boolean(value);
    };
    
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
            
            const html = `<span id="${delayedId}" class="delayed" data-content="${encodedContent}" style="animation-delay: ${time}ms;"></span><script>setTimeout(function() { var elem = document.getElementById('${delayedId}'); var content = decodeURIComponent(atob(elem.getAttribute('data-content'))); window.renderDynamicContent('${delayedId}', content); }, ${time});</script>`;
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
    
    // Parse <<typewriter speed="50" skipable>>text<</typewriter>>
    const typewriters = extractBetweenDelimiter(result, '<<typewriter', '<</typewriter>>');
    for (const macro of typewriters) {
        const speedMatch = macro.content.match(/speed="(\d+)"(.*?)>>(.*)/s);
        if (speedMatch) {
            const speed = speedMatch[1];
            const attrs = speedMatch[2];
            const skipable = /\bskipable\b/.test(attrs);
            const content = speedMatch[3];
            const processedContent = renderInlineMacroBody(content, context, depth);
            const encodedContent = btoa(encodeURIComponent(processedContent));
            const html = `<span class="typewriter" data-speed="${speed}"${skipable ? ' data-skipable="true"' : ''} data-content="${encodedContent}"></span>`;
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

    // Parse <<blink fade>>text<</blink>> or <<blink>>text<</blink>>
    const blinks = extractBetweenDelimiter(result, '<<blink', '<</blink>>');
    for (const macro of blinks) {
        let textContent = macro.content;
        let fade = false;

        const attrMatch = macro.content.match(/^(.*?)>>([\s\S]*)$/);
        if (attrMatch) {
            const attrs = attrMatch[1];
            textContent = attrMatch[2];
            fade = /\bfade\b/i.test(attrs);
        } else if (macro.content.startsWith('>>')) {
            textContent = macro.content.slice(2);
        }

        const htmlContent = renderInlineMacroBody(textContent, context, depth);
        const className = fade ? 'blink blink-fade' : 'blink';
        const html = `<span class="${className}">${htmlContent}</span>`;
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

    // Parse <<input var="name" placeholder="Type..." value="" type="string">>
    const inputs = extractBetweenDelimiter(result, '<<input', '>>');
    for (const macro of inputs) {
        const varMatch = macro.content.match(/var=["']([a-zA-Z_$][a-zA-Z0-9_$]*)["']/);
        if (!varMatch) {
            result = result.replace(macro.fullMatch, '');
            continue;
        }

        const varName = varMatch[1];
        const placeholderMatch = macro.content.match(/placeholder=["']([\s\S]*?)["']/);
        const valueMatch = macro.content.match(/value=["']([\s\S]*?)["']/);
        const typeMatch = macro.content.match(/type=["'](string|number|boolean|json)["']/i);
        const inputTypeMatch = macro.content.match(/input=["']([a-zA-Z0-9_-]+)["']/i);

        const explicitType = typeMatch ? typeMatch[1].toLowerCase() : null;
        const metadataType = context.state && context.state.variableMetadata && context.state.variableMetadata[varName]
            ? context.state.variableMetadata[varName].type
            : null;
        const effectiveType = explicitType || metadataType || 'string';

        const hasExistingValue = context.state && context.state.variables && Object.prototype.hasOwnProperty.call(context.state.variables, varName);
        if (!hasExistingValue && context.state && context.state.variables) {
            let initialValue = valueMatch ? valueMatch[1] : '';
            if (effectiveType === 'number') {
                const parsed = parseFloat(initialValue);
                initialValue = Number.isNaN(parsed) ? 0 : parsed;
            } else if (effectiveType === 'boolean') {
                initialValue = parseBooleanAttribute(initialValue);
            } else if (effectiveType === 'json') {
                try {
                    initialValue = initialValue ? JSON.parse(initialValue) : null;
                } catch (_error) {
                    initialValue = null;
                }
            }
            context.state.variables[varName] = initialValue;
        }

        if (context.state) {
            if (!context.state.variableMetadata) {
                context.state.variableMetadata = {};
            }
            const existingMetadata = context.state.variableMetadata[varName] || {};
            context.state.variableMetadata[varName] = {
                ...existingMetadata,
                type: effectiveType
            };
        }

        let currentValue = '';
        if (context.state && context.state.variables && Object.prototype.hasOwnProperty.call(context.state.variables, varName)) {
            const rawValue = context.state.variables[varName];
            if (rawValue !== null && rawValue !== undefined) {
                currentValue = String(rawValue);
            }
        }

        const placeholder = placeholderMatch ? placeholderMatch[1] : '';
        const htmlInputType = inputTypeMatch ? inputTypeMatch[1] : (effectiveType === 'number' ? 'number' : 'text');
        const html = `<input class="var-input" data-var="${varName}" data-type="${effectiveType}" type="${htmlInputType}" value="${escapeHtml(currentValue)}"${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''}>`;
        result = result.replace(macro.fullMatch, html);
    }

    // Parse <<checkbox var="name" label="Text" checked>>
    const checkboxes = extractBetweenDelimiter(result, '<<checkbox', '>>');
    for (const macro of checkboxes) {
        const varMatch = macro.content.match(/var=["']([a-zA-Z_$][a-zA-Z0-9_$]*)["']/);
        if (!varMatch) {
            result = result.replace(macro.fullMatch, '');
            continue;
        }

        const varName = varMatch[1];
        const labelMatch = macro.content.match(/label=["']([\s\S]*?)["']/);
        const checkedValueMatch = macro.content.match(/checked=["']([\s\S]*?)["']/i);
        const hasCheckedFlag = /\bchecked\b/i.test(macro.content);

        const hasExistingValue = context.state && context.state.variables && Object.prototype.hasOwnProperty.call(context.state.variables, varName);

        const hasExplicitCheckedDefault = Boolean(checkedValueMatch) || hasCheckedFlag;
        const initialChecked = checkedValueMatch
            ? parseBooleanAttribute(checkedValueMatch[1])
            : hasCheckedFlag;

        if (!hasExistingValue && hasExplicitCheckedDefault && context.state && context.state.variables) {
            context.state.variables[varName] = initialChecked;
        }

        if (context.state) {
            if (!context.state.variableMetadata) {
                context.state.variableMetadata = {};
            }
            if (!context.state.variableMetadata[varName]) {
                context.state.variableMetadata[varName] = {
                    type: 'boolean'
                };
            }
        }

        const currentChecked = hasExistingValue
            ? coerceBooleanValue(context.state.variables[varName])
            : initialChecked;

        const labelText = labelMatch ? labelMatch[1] : '';
        const labelHTML = labelText ? parseInlineMarkdown(labelText) : '';
        const html = labelText
            ? `<label class="interactive-checkbox"><input class="var-checkbox" data-var="${varName}" type="checkbox"${currentChecked ? ' checked' : ''}> <span>${labelHTML}</span></label>`
            : `<input class="var-checkbox" data-var="${varName}" type="checkbox"${currentChecked ? ' checked' : ''}>`;
        result = result.replace(macro.fullMatch, html);
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
            replacementHTML = `<span id="${currentId}-trigger" class="clickable-text onclick-reveal-trigger" data-auto="${autoReveal}" data-content="${encodedBody}" onclick="${onclickCode}" style="${triggerStyle}">${clickLabel}</span><span id="${currentId}" style="display: none;"></span>`;
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
    document.querySelectorAll('.var-input').forEach(elem => {
        if (elem.dataset.bound) return;
        elem.dataset.bound = 'true';

        elem.addEventListener('input', () => {
            const varName = elem.dataset.var;
            if (!varName || typeof window.setPassageVariable !== 'function') return;
            window.setPassageVariable(varName, elem.value, elem.dataset.type || 'string');
        });
    });

    document.querySelectorAll('.var-checkbox').forEach(elem => {
        if (elem.dataset.bound) return;
        elem.dataset.bound = 'true';

        elem.addEventListener('change', () => {
            const varName = elem.dataset.var;
            if (!varName || typeof window.setPassageVariable !== 'function') return;
            window.setPassageVariable(varName, elem.checked, 'boolean');
        });
    });

    document.querySelectorAll('.typewriter').forEach(elem => {
        if (elem.dataset.animated) return; 
        elem.dataset.animated = 'true';
        
        const encodedContent = elem.dataset.content || '';
        const htmlContent = encodedContent ? decodeURIComponent(atob(encodedContent)) : '';
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
            let skipped = false;
            let onClick = null;
            
            const skipAnimation = () => {
                if (skipped) return;
                skipped = true;
                clearInterval(interval);
                for (const tn of textNodes) {
                    tn.node.textContent = tn.fullText;
                }
                if (onClick) {
                    document.removeEventListener('click', onClick);
                }
            };

            if (elem.dataset.skipable === 'true') {
                onClick = () => {
                    skipAnimation();
                };
                document.addEventListener('click', onClick);
            }

            const interval = setInterval(() => {
                if (currentNodeIndex >= textNodes.length) {
                    clearInterval(interval);
                    if (onClick) {
                        document.removeEventListener('click', onClick);
                    }
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
