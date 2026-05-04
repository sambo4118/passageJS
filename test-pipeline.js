import { tokenize } from './src/Lexer.js'
import { parseSyntax } from './src/syntaxParser.js'
import { convertNodes } from './src/semanticsParser.js'

const samples = [
    'plain text only',
    '@textcolor(red){ hello }',
    'before @textcolor(blue){ middle } after',
    '@textcolor(green){ outer @textcolor(red){ inner } trailing }',
    'line one\nline two\n@textcolor(red){ multi\nline }',
]

for (const src of samples) {
    console.log('='.repeat(60))
    console.log('SRC:', JSON.stringify(src))
    try {
        const tokens = tokenize(src)
        const syntax = parseSyntax(tokens)
        const semantic = convertNodes(syntax)
        console.log('OUT:', JSON.stringify(semantic, null, 2))
    } catch (err) {
        console.log('ERR:', err.message)
    }
}
