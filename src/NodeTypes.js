import { parseInline } from 'marked';

function targetToString(target) {
    if (typeof target === 'string') return target.trim();
    if (Array.isArray(target)) {
            return target
        .map((n) => (n && typeof n === 'object' && 'value' in n ? String(n.value) : ''))
        .join('')
        .trim();
    }
    if (target && typeof target === 'object' && 'value' in target) return String(target.value).trim();
    return '';
}

function contentToString(content) {
    if (!Array.isArray(content)) return '';
    return content
        .map((node) => {
            if (!node || typeof node !== 'object') return '';
            if (node.name === 'Text') return String(node.value ?? '');
            if (node.name === 'Newline') return ' ';
            return '';
        })
        .join('')
        .trim();
}

function targetToHref(target) {
    const normalized = target
        .replace(/^\/+/, '')
        .replace(/^passages?\//, '')
        .replace(/\.psg$/i, '');
    return `/passage/${normalized}.psg`;
}

function evaluateTruthiness(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        if (trimmed === 'false' || trimmed == false) return false;
        return true;
    }
    return Boolean(value);
}

export class Newline {
    constructor() {
        this.name = 'Newline';
    }
    render(container) {
        container.appendChild(document.createElement('br'));
    }
}

export class Text {
    constructor(value) {
        this.name = 'Text';
        this.value = value;
    }
    render(container) {
        const html = parseInline(this.value);
        const div = document.createElement('div');
        div.innerHTML = html;
        while (div.firstChild) container.appendChild(div.firstChild);
    }
}

export class Link {
    constructor(argvalues, content) {
        this.name = 'Link';
        this.target = argvalues.target;
        this.content = content;
    }
    static args = [
            { name: 'target', required: true },
        ]
    render(container, state, navigate) {
        const target = targetToString(this.target);
        const label = contentToString(this.content) || target;

        const link = document.createElement('a');
        link.className = 'passage-link';
        link.href = targetToHref(target);
        link.textContent = label;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(target);
        });
        container.appendChild(link);
    }
}

export class TextSize {
    constructor(argvalues, content) {
        this.name = 'TextSize';
        this.size = argvalues.size;
        this.content = content;
    }
    static args = [
        { name: 'size', required: true }
    ]
    render(container, state, _) {
        const size = targetToString(this.size);
        const div = document.createElement('div');
        div.style.fontSize = size;
        this.content.forEach((node) => {
            if (node && typeof node === 'object' && typeof node.render === 'function') {
                node.render(div, state, _);
            }
        });
        container.appendChild(div);
    }
}

export class Var {
    constructor(argvalues, content) {
        this.name = 'Var';
        this.varName = argvalues.varName;
        this.value = argvalues.value;
        this.hidden = argvalues.hidden;
    }
    static args = [
        { name: 'varName', required: true },
        { name: 'value', required: true },
        { name: 'hidden', required: false }
    ]
    render(container, state, _) {
        const varName = targetToString(this.varName);
        const value = targetToString(this.value);
        state[varName] = value;
        if (evaluateTruthiness(targetToString(this.hidden))) return;
        const span = document.createElement('span');
        span.textContent = value;
        container.appendChild(span);
    }
}