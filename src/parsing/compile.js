import { lexer } from "./lexer.js";
import { parse } from "./parser.js";
import { convertSyntax } from "./convertSyntax.js";

export function compile(text) {
    const lexed = lexer(text);
    const parsed = parse(lexed);
    const converted = convertSyntax(parsed);
    return converted;
}