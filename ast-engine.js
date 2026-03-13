import { evaluateSafeMathExpression } from './macros.js';

export function tokenize(input) {
    const source = String(input ?? "");
    const tokens = [];

    let currentIndex = 0;

    function addToken(type, value, start, end, extra = {}) {
        tokens.push({ type, value, start, end, ...extra });
    }

    while (currentIndex < source.length) {
        const start = currentIndex;

        // Newline
        if (source[currentIndex] === '\n') {
            currentIndex++;
            addToken('NEWLINE', '\n', start, currentIndex);
            continue;
        }

        // Macro close tag: <</macroname>>
        if (source.startsWith('<</', currentIndex)) {
            const closeEnd = source.indexOf('>>', currentIndex + 3);
            if (closeEnd === -1) {
                // Unclosed <</, treat the leading < as plain text and retry
                addToken('TEXT', '<', start, start + 1);
                currentIndex = start + 1;
                continue;
            }
            const raw = source.slice(currentIndex, closeEnd + 2);
            const name = source.slice(currentIndex + 3, closeEnd).trim();
            currentIndex = closeEnd + 2;
            addToken('MACRO_CLOSE', raw, start, currentIndex, { name });
            continue;
        }

        // Macro open tag: <<macroname attrs>>
        if (source.startsWith('<<', currentIndex)) {
            const closeEnd = source.indexOf('>>', currentIndex + 2);
            if (closeEnd === -1) {

                // Unclosed <<, treat the leading < as plain text and retry
                addToken('TEXT', '<', start, start + 1);
                currentIndex = start + 1;
                continue;
            }
            const raw = source.slice(currentIndex, closeEnd + 2);
            const inner = source.slice(currentIndex + 2, closeEnd);
            const spaceIdx = inner.search(/\s/);
            const name = spaceIdx === -1 ? inner : inner.slice(0, spaceIdx);
            const attrs = spaceIdx === -1 ? '' : inner.slice(spaceIdx + 1).trim();
            currentIndex = closeEnd + 2;
            addToken('MACRO_OPEN', raw, start, currentIndex, { name, attrs });
            continue;
        }

        // Plain text: accumulate until newline or start of a macro
        let end = currentIndex;
        while (end < source.length && source[end] !== '\n' && !source.startsWith('<<', end)) {
            end++;
        }

        if (end > currentIndex) {
            addToken('TEXT', source.slice(currentIndex, end), start, end);
            currentIndex = end;
            continue;
        }

        // Fallback: consume one character as TEXT to avoid infinite loops on malformed input
        addToken('TEXT', source[currentIndex], start, currentIndex + 1);
        currentIndex++;
    }

    return tokens;
}

export function parse(input) {
    const tokens = tokenize(input);

    const root = { type: 'root', children: [] };
    const stack = [root];

    function current() {
        return stack[stack.length - 1];
    }

    for (const token of tokens) {
        if (token.type === 'MACRO_OPEN') {
            const node = { type: 'macro', name: token.name, attrs: token.attrs, children: [] };
            current().children.push(node);
            stack.push(node);
            continue;
        }

        if (token.type === 'MACRO_CLOSE') {
            // Pop back to the matching open, ignoring mismatched closes
            for (let i = stack.length - 1; i > 0; i--) {
                if (stack[i].type === 'macro' && stack[i].name === token.name) {
                    stack.length = i;
                    break;
                }
            }
            continue;
        }

        if (token.type === 'TEXT') {
            current().children.push({ type: 'text', value: token.value });
            continue;
        }

        if (token.type === 'NEWLINE') {
            current().children.push({ type: 'newline' });
            continue;
        }
    }

    return root;
}

// ---------------------------------------------------------------------------
// Attr parser
// ---------------------------------------------------------------------------

// Parses the attrs string from a macro open tag into a plain object.
// key="value" or key='value' pairs → string values.
// Bare words (flags) → boolean true.
export function parseAttrs(str) {
    const attrs = {};
    const kvPattern = /([a-zA-Z_-]+)=["']([^"']*)["']/g;
    let m;
    while ((m = kvPattern.exec(str)) !== null) {
        attrs[m[1]] = m[2];
    }
    // Collect standalone flag words that aren't part of a key="value" pair
    const withoutKV = str.replace(/[a-zA-Z_-]+=["'][^"']*["']/g, '');
    const flagPattern = /\b([a-zA-Z][a-zA-Z_-]*)\b/g;
    while ((m = flagPattern.exec(withoutKV)) !== null) {
        if (!(m[1] in attrs)) attrs[m[1]] = true;
    }
    return attrs;
}

// ---------------------------------------------------------------------------
// Renderer / visitor
// ---------------------------------------------------------------------------

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function substituteVars(text, context) {
    const vars = context.state?.variables ?? {};
    return text.replace(/\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, (match, name) => {
        if (name in vars) {
            const value = vars[name];
            const display = typeof value === 'object' ? escapeHtml(JSON.stringify(value)) : escapeHtml(String(value));
            return `<span class="var-display" data-var="${name}">${display}</span>`;
        }
        return match;
    });
}

// Wrap each non-space character in `html` with a span from spanFn(char, globalIndex).
// Skips over existing HTML tags so they aren't split.
function wrapChars(html, spanFn) {
    let i = 0;
    return html.split(/(<[^>]+>)/).map(part => {
        if (part.startsWith('<')) return part;
        return [...part].map(char => {
            if (char === ' ') return ' ';
            return spanFn(char, i++);
        }).join('');
    }).join('');
}

// Extracts the raw text content of a node tree without any HTML rendering or markdown.
// Used for expression contexts (<<calc>>, <<var>> value extraction) where only the
// plain string value is needed.
function rawText(node, context) {
    const vars = context.state?.variables ?? {};
    switch (node.type) {
        case 'root':
        case 'macro':
            return node.children.map(c => rawText(c, context)).join('');
        case 'text':
            return node.value.replace(/\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g, (m, name) =>
                name in vars ? String(vars[name]) : m
            );
        case 'newline': return '\n';
        default: return '';
    }
}

export function render(node, context = {}, depth = 0) {
    switch (node.type) {
        case 'root':   return node.children.map(c => render(c, context, depth)).join('');
        case 'text': {
            const substituted = substituteVars(node.value, context);
            if (depth > 0 && window.marked) return window.marked.parseInline(substituted);
            return substituted;
        }
        case 'newline': return '\n';
        case 'macro':  return renderMacro(node, context, depth);
        default:       return '';
    }
}

function renderChildren(node, context, depth) {
    return node.children.map(c => render(c, context, depth)).join('');
}

function renderMacro(node, context, depth) {
    const attrs = parseAttrs(node.attrs);

    switch (node.name) {

        case 'wiggle': {
            const inner = renderChildren(node, context, depth + 1);
            const wrapped = wrapChars(inner, (char) => {
                const delay = (Math.random() * 0.3).toFixed(3);
                const dur   = (0.3 + Math.random() * 0.3).toFixed(3);
                return `<span style="animation-delay:${delay}s;animation-duration:${dur}s;">${char}</span>`;
            });
            return `<span class="wiggle">${wrapped}</span>`;
        }

        case 'hop': {
            const inner = renderChildren(node, context, depth + 1);
            const speed = parseInt(attrs.speed ?? 100);
            const wrapped = wrapChars(inner, (char, i) =>
                `<span style="animation-delay:${(i * speed / 1000).toFixed(3)}s;">${char}</span>`
            );
            return `<span class="hop">${wrapped}</span>`;
        }

        case 'wave': {
            const inner = renderChildren(node, context, depth + 1);
            const speed = parseInt(attrs.speed ?? 100);
            const wrapped = wrapChars(inner, (char, i) =>
                `<span style="animation-delay:${(i * speed / 1000).toFixed(3)}s;">${char}</span>`
            );
            return `<span class="wave">${wrapped}</span>`;
        }

        case 'fadein': {
            const inner = renderChildren(node, context, depth + 1);
            return `<span class="fade-in" style="animation-delay:${attrs.delay ?? 0}ms;">${inner}</span>`;
        }

        case 'delayed': {
            const inner = renderChildren(node, context, depth + 1);
            const time = attrs.time ?? 0;
            return `<span class="delayed" style="animation-delay:${time}ms;">${inner}</span>`;
        }

        case 'typewriter': {
            const inner = renderChildren(node, context, depth + 1);
            const speed = attrs.speed ?? 50;
            const skipable = 'skipable' in attrs;
            const encoded = btoa(encodeURIComponent(inner));
            return `<span class="typewriter" data-speed="${speed}"${skipable ? ' data-skipable="true"' : ''} data-content="${encoded}"></span>`;
        }

        case 'blink': {
            const inner = renderChildren(node, context, depth + 1);
            const cls = 'fade' in attrs ? 'blink blink-fade' : 'blink';
            return `<span class="${cls}">${inner}</span>`;
        }

        case 'textcolor': {
            if (node.children.length === 0) {
                // Self-closing form: sets body text color as a side-effect
                if (attrs.color && typeof document !== 'undefined') {
                    document.body.style.color = attrs.color;
                }
                return '';
            }
            const inner = renderChildren(node, context, depth + 1);
            return attrs.color ? `<span style="color:${attrs.color};">${inner}</span>` : inner;
        }

        case 'background': {
            if (typeof document !== 'undefined' && attrs.color) {
                document.body.style.backgroundColor = attrs.color;
            }
            return '';
        }

        case 'title': {
            const inner = renderChildren(node, context, depth + 1).trim();
            if (typeof document !== 'undefined') document.title = inner;
            return '';
        }

        case 'onclick': return renderOnclick(node, attrs, context, depth);

        case 'button': {
            const label = attrs.text ?? renderChildren(node, context, depth + 1);
            const action = attrs.action ?? attrs.js ?? attrs.onclick ?? '';
            return `<button class="interactive-button" onclick="${escapeHtml(action)}">${label}</button>`;
        }

        case 'if':     return renderIf(node, context, depth);
        case 'var':    return renderVar(node, attrs, context, depth);
        case 'random': return renderRandom(node, attrs, context, depth);

        case 'calc': {
            // Use rawText so var substitution stays as plain numbers, not HTML spans
            const expr = rawText(node, context).trim();
            try {
                const result = evaluateSafeMathExpression(expr);
                const encoded = btoa(encodeURIComponent(expr));
                return `<span class="calc-display" data-expr="${encoded}">${String(result)}</span>`;
            } catch (err) {
                console.error('Calculation error:', err, 'Expression:', expr);
                return `[calc error: ${escapeHtml(expr)}]`;
            }
        }

        case 'input': {
            const varName = attrs.var ?? '';
            if (!varName) return '';
            const placeholder = attrs.placeholder ?? '';
            const explicitType = (attrs.type ?? '').toLowerCase() || null;
            const metaType = context.state?.variableMetadata?.[varName]?.type ?? null;
            const effectiveType = explicitType || metaType || 'string';
            const htmlInputType = attrs.input ?? (effectiveType === 'number' ? 'number' : 'text');
            const vars = context.state?.variables ?? {};
            if (context.state?.variables && !(varName in vars)) {
                let initial = attrs.value ?? '';
                if (effectiveType === 'number') initial = isNaN(parseFloat(initial)) ? 0 : parseFloat(initial);
                else if (effectiveType === 'boolean') initial = /^(true|1|yes|on)$/i.test(String(initial));
                context.state.variables[varName] = initial;
            }
            if (context.state) {
                if (!context.state.variableMetadata) context.state.variableMetadata = {};
                context.state.variableMetadata[varName] = { ...(context.state.variableMetadata[varName] ?? {}), type: effectiveType };
            }
            const currentValue = varName in vars ? String(vars[varName] ?? '') : (attrs.value ?? '');
            return `<input class="var-input" data-var="${varName}" data-type="${effectiveType}" type="${htmlInputType}" value="${escapeHtml(currentValue)}"${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''}>`;
        }

        case 'checkbox': {
            const varName = attrs.var ?? '';
            if (!varName) return '';
            const labelText = attrs.label ?? '';
            const hasCheckedAttr = 'checked' in attrs;
            const checkedDefault = hasCheckedAttr
                ? (attrs.checked === true || /^(true|1|yes|on)$/i.test(String(attrs.checked)))
                : false;
            const vars = context.state?.variables ?? {};
            if (context.state?.variables && !(varName in vars) && hasCheckedAttr) {
                context.state.variables[varName] = checkedDefault;
            }
            if (context.state) {
                if (!context.state.variableMetadata) context.state.variableMetadata = {};
                if (!context.state.variableMetadata[varName]) context.state.variableMetadata[varName] = { type: 'boolean' };
            }
            const currentChecked = varName in vars ? coerceBool(vars[varName]) : checkedDefault;
            const labelHtml = labelText ? (window.marked ? window.marked.parseInline(labelText) : labelText) : '';
            if (labelHtml) return `<label class="interactive-checkbox"><input class="var-checkbox" data-var="${varName}" type="checkbox"${currentChecked ? ' checked' : ''}> <span>${labelHtml}</span></label>`;
            return `<input class="var-checkbox" data-var="${varName}" type="checkbox"${currentChecked ? ' checked' : ''}>`;
        }

        default:
            // Unknown macro: pass children through unchanged
            return renderChildren(node, context, depth + 1);
    }
}

function renderOnclick(node, attrs, context, depth) {
    if (!context.state) context.state = { onclickRevealCounter: 0 };
    if (typeof context.state.onclickRevealCounter !== 'number') context.state.onclickRevealCounter = 0;

    const body = renderChildren(node, context, depth + 1);
    const triggerText = attrs.text ?? '';
    const action = attrs.action ?? attrs.js ?? attrs.onclick ?? '';
    const hasBody = body.trim().length > 0;
    const hasTrigger = triggerText.trim().length > 0;

    if (hasBody) {
        const id = `onclick-reveal-${context.state.onclickRevealCounter++}`;
        const encoded = btoa(encodeURIComponent(body));
        let onclickCode =
            `var content=decodeURIComponent(atob(this.getAttribute('data-content')));` +
            `window.displayRenderedContent('${id}',content);` +
            `document.getElementById('${id}').style.display='block';this.style.display='none';`;
        if (action.trim()) {
            onclickCode += ` try{${action}}catch(e){console.error('Onclick action failed:',e);}`;
        }
        const triggerStyle = hasTrigger ? 'cursor:pointer;text-decoration:underline;' : 'display:none;';
        return `<span id="${id}-trigger" class="clickable-text onclick-reveal-trigger" data-auto="${!hasTrigger}" data-content="${encoded}" onclick="${onclickCode}" style="${triggerStyle}">${triggerText}</span>` +
               `<span id="${id}" style="display:none;"></span>`;
    }

    if (!triggerText.trim()) return '';
    return action.trim()
        ? `<span class="clickable-text" onclick="${escapeHtml(action)}" style="cursor:pointer;text-decoration:underline;">${triggerText}</span>`
        : triggerText;
}

function coerceBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number')  return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (['true','1','yes','on'].includes(s))    return true;
        if (['false','0','no','off',''].includes(s)) return false;
    }
    return Boolean(value);
}

function renderIf(node, context, depth) {
    // node.attrs contains the full condition: "[not ]varname [operator rhs]"
    const m = node.attrs.trim().match(/^(not\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+(.+))?$/i);
    if (!m) return '';

    const negate  = Boolean(m[1]);
    const varName = m[2];
    const condExpr = (m[3] ?? '').trim();
    const vars = context.state?.variables ?? {};
    const varValue = varName in vars ? vars[varName] : null;

    const evalPart = (expr) => {
        const cmp = expr.match(/^(equals|is not|is|not equals|at most|less than or equal|at least|greater than or equal|less than|greater than)\s+(.+)$/i);
        if (!cmp) return coerceBool(varValue);
        const op  = cmp[1].toLowerCase();
        const raw = cmp[2].trim();
        let rhs;
        if      (raw === 'true')              rhs = true;
        else if (raw === 'false')             rhs = false;
        else if (raw === 'null')              rhs = null;
        else if (/^["'].*["']$/.test(raw))    rhs = raw.slice(1, -1);
        else if (!isNaN(raw))                 rhs = parseFloat(raw);
        else                                  rhs = raw;
        switch (op) {
            case 'equals':
            case 'is':                        return varValue === rhs;
            case 'not equals':
            case 'is not':                    return varValue !== rhs;
            case 'less than':                 return varValue < rhs;
            case 'greater than':              return varValue > rhs;
            case 'at most':
            case 'less than or equal':        return varValue <= rhs;
            case 'at least':
            case 'greater than or equal':     return varValue >= rhs;
            default:                          return false;
        }
    };

    let result;
    if (!condExpr) {
        result = coerceBool(varValue);
    } else {
        const parts = condExpr.split(/\s+(and|or)\s+/i);
        result = evalPart(parts[0]);
        for (let i = 1; i < parts.length; i += 2) {
            const connector = (parts[i] ?? '').toLowerCase();
            if (connector === 'and') result = result && evalPart(parts[i + 1] ?? '');
            else if (connector === 'or')  result = result || evalPart(parts[i + 1] ?? '');
        }
    }
    if (negate) result = !result;

    const condPayload = btoa(negate ? `__negate__:${condExpr || '__truthy__'}` : condExpr || '__truthy__');
    const inner = result ? renderChildren(node, context, depth + 1) : '';
    return `<span class="conditional" data-var="${varName}" data-condition="${condPayload}" style="${result ? '' : 'display:none;'}">${inner}</span>`;
}

function renderVar(node, attrs, context, depth) {
    // Variable name is the first whitespace-delimited token in node.attrs
    const varName = node.attrs.trim().split(/\s+/)[0];
    if (!varName) return '';

    const rawValue = rawText(node, context).trim();

    if (!context.state) context.state = {};
    if (!context.state.variables) context.state.variables = {};

    let value = rawValue;
    if (attrs.type === 'number') {
        value = parseFloat(rawValue);
        if (isNaN(value)) value = attrs.default ? parseFloat(attrs.default) : 0;
    } else if (attrs.type === 'boolean') {
        value = rawValue.toLowerCase() === 'true';
    } else if (attrs.type === 'json') {
        try { value = JSON.parse(rawValue); }
        catch (_) { value = attrs.default ? JSON.parse(attrs.default) : null; }
    }

    context.state.variables[varName] = value;
    return '';
}

function renderRandom(node, attrs, context, depth) {
    const oddsStr = attrs.odds ?? '100%';
    let prob = 1;
    const pct  = oddsStr.match(/^(\d+(?:\.\d+)?)\s*%$/);
    const frac = oddsStr.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (pct)                              prob = parseFloat(pct[1]) / 100;
    else if (frac && parseFloat(frac[2])) prob = parseFloat(frac[1]) / parseFloat(frac[2]);
    prob = Math.max(0, Math.min(1, prob));

    const roll = context.rng ? context.rng.next() : Math.random();
    if (roll >= prob) return '';
    return `<span class="random-content">${renderChildren(node, context, depth + 1)}</span>`;
}