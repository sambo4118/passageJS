export function parse(text) {
    import { tokenize } from './Lexer.js';
    import { parseSyntax } from './syntaxParser.js';
    import { parseSemantics } from './semanticsParser.js';
    
    const tokens = tokenize(text);
    const parsed = parseSyntax(tokens);
    return parseSemantics(parsed);
}