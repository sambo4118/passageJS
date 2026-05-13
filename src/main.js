import { lexer } from "./parsing/lexer.js";
import { parse } from "./parsing/parser.js";
import { convertSyntax } from "./parsing/convertSyntax.js";

export function compile(text) {
    const lexed = lexer(text);
    const parsed = parse(lexed);
    const converted = convertSyntax(parsed);
    return converted;
}