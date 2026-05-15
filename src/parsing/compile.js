import { lexer } from "./lexer.js";
import { parse } from "./parser.js";
import { convertSyntax } from "./convertSyntax.js";

export function compile(text) {
    const lexed = lexer(text);
    const converted = convertSyntax(lexed);
    const parsed = parse(converted);
    return parsed;
}