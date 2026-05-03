
class PlainText {
    constructor(text) {
        this.text = text
        this.type = "PlainText"
    }
}
class TagStart {
    constructor() {
        this.type = "TagStart"
    }
}

function tokenize(text) {
    
    let remainingText = text
    const tokens = [];
    
    while (remainingText.length > 0) {
        const char = remainingText[0]
        
        if (char === "@") {
            tokens.push({ type : AT })
            remainingText = remainingText.slice(1)
            continue;
        }

        if (char === '(') { tokens.push({ type: 'L_PAREN' }); remainingText = remainingText.slice(1); continue; }
        if (char === ')') { tokens.push({ type: 'R_PAREN' }); remainingText = remainingText.slice(1); continue; }
        if (char === '{') { tokens.push({ type: 'L_BRACE' }); remainingText = remainingText.slice(1); continue; }
        if (char === '}') { tokens.push({ type: 'R_BRACE' }); remainingText = remainingText.slice(1); continue; }

        const wordMatch = remainingText.match(/^[^@(){}\s]+/);
        if (wordMatch) {
            tokens.push({ type : 'TEXT', value: wordMatch[0] })
            remainingText = remainingText.slice(wordMatch[0].length)
        }
    }
}