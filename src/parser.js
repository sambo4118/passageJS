import { tokenize } from './Lexer.js';
import { parseSyntax } from './syntaxParser.js';
import { parseSemantics } from './semanticsParser.js';
import { Text } from './NodeTypes.js';

export function parse(text) {
    try {
        const tokens = tokenize(text);
        const parsed = parseSyntax(tokens);
        return parseSemantics(parsed);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return [new Text(`[Parse error] ${message}`)];
    }
}