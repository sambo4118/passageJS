export function parseSyntax(tokens) {
    const state = { tokens, i: 0 };
    return parseContent(state, []);
}

// #region helpers

const peek   = (state) => state.tokens[state.i];
const eat    = (state) => state.tokens[state.i++];
const accept = (state, type) => peek(state)?.type === type ? eat(state) : null;
const expect = (state, type) => {
    const tok = peek(state);
    if (tok?.type !== type) {
        throw new Error(
            `Expected ${type} but got ${tok?.type ?? 'EOF'} at index ${tok?.index ?? '?'}`
        );
    }
    return eat(state);
};

// #endregion

function parseContent(state, stopTypes, textType = 'TEXT') {
    const nodes = [];

    while (state.i < state.tokens.length && !stopTypes.includes(peek(state).type)) {
        const t = peek(state);

        if (t.type === 'NEWLINE') {
            nodes.push({ type: 'NEWLINE', index: t.index, line: t.line });
            eat(state);
            continue;
        }

        if (t.type === 'AT') {
            nodes.push(parseTag(state));
            continue;
        }

        nodes.push(parseText(state, stopTypes, textType));
    }

    return nodes;
}

function parseTag(state) {
    const atToken   = expect(state, 'AT');
    const nameToken = expect(state, 'TEXT');

    let args = null;
    if (accept(state, 'L_PAREN')) {
        args = parseArgs(state, ['R_PAREN'], 'PARAMS');
        expect(state, 'R_PAREN');
    }

    let body = null;
    if (accept(state, 'L_BRACE')) {
        body = parseContent(state, ['R_BRACE']);
        expect(state, 'R_BRACE');
    }

    return {
        type: 'TAG',
        name: nameToken.value,
        args,
        body,
        index: atToken.index,
        line: atToken.line,
    };
}

function parseText(state, outerStopTypes, textType = 'TEXT') {
    const startTok = peek(state);
    const stop = ['AT', 'NEWLINE', ...outerStopTypes];
    let value = '';

    while (state.i < state.tokens.length && !stop.includes(peek(state).type)) {
        const t = eat(state);
        switch (t.type) {
            case 'TEXT':    value += t.value; break;
            case 'L_PAREN': value += '(';     break;
            case 'R_PAREN': value += ')';     break;
            case 'L_BRACE': value += '{';     break;
            case 'R_BRACE': value += '}';     break;
            case 'COMMA':   value += ',';     break;
            case 'EQUALS':  value += '=';     break;
        }
    }

    return { type: textType, value, index: startTok.index, line: startTok.line };
}

function parseArgs(state) {
    const args = [];

    if (peek(state).type === 'R_PAREN') return args;
    args.push(parseOneArg(state));
    while (accept(state, 'COMMA')) {
        args.push(parseOneArg(state));
    }

    return args;
}

function parseOneArg(state) {
    const startToken = peek(state);

    let name = null;
    if (peek(state).type === 'TEXT' && state.tokens[state.i + 1]?.type === 'EQUALS') {
        name = eat(state).value;
        eat(state);
    }

    const value = parseContent(state, ['COMMA', 'R_PAREN'], 'ARG');

    return {
        type: 'ARG',
        name,
        value,
        index: startToken.index,
        line: startToken.line
    };
}