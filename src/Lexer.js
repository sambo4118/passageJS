export function tokenize(text) {
    
    let line = 1;
    let remainingText = text
    const tokens = [];
    
    while (remainingText.length > 0) {
        const char = remainingText[0]
        let index = text.length - remainingText.length

        if (char === "@") {
            tokens.push({ type : 'AT', index: index, line: line })
            remainingText = remainingText.slice(1)
            continue;
        }

        if (char === '(')  { tokens.push({ type: 'L_PAREN', index: index, line: line }); remainingText = remainingText.slice(1); continue; }
        if (char === ')')  { tokens.push({ type: 'R_PAREN', index: index, line: line }); remainingText = remainingText.slice(1); continue; }
        if (char === '{')  { tokens.push({ type: 'L_BRACE', index: index, line: line }); remainingText = remainingText.slice(1); continue; }
        if (char === '}')  { tokens.push({ type: 'R_BRACE', index: index, line: line }); remainingText = remainingText.slice(1); continue; }
        if (char === `\n`) { tokens.push({ type: 'NEWLINE', index: index, line: line }); remainingText = remainingText.slice(1); line++; continue; }
        if (char === ',')  { tokens.push({ type: 'COMMA', index: index, line: line }); remainingText = remainingText.slice(1); continue; }
        if (char === '=')  { tokens.push({ type: 'EQUALS', index: index, line: line }); remainingText = remainingText.slice(1); continue; }


        const wordMatch = remainingText.match(/^[^@(){}\n,=]+/);
        if (wordMatch) {
            tokens.push({ type : 'TEXT', value: wordMatch[0], index: index, line: line })
            remainingText = remainingText.slice(wordMatch[0].length)
            continue;
        }

        throw new Error(`Unexpected character: ${char}`);
    }
    return tokens;
}