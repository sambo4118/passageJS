export function lexer(text) {
    const tokens = [];
    let current = -1;
    let runningText = ""

    const flush = () => {
        if (runningText) {
            tokens.push({ type: "text", value: runningText });
            runningText = "";
        }
    }

    while (current < text.length - 1) {
        current++;

        const char = text[current];

        if (char === "@")  { flush(); tokens.push({ type: "at",                 }); continue; }
        if (char === "(")  { flush(); tokens.push({ type: "openparenthesis"     }); continue; }
        if (char === ")")  { flush(); tokens.push({ type: "closeparenthesis"    }); continue; }
        if (char === "[")  { flush(); tokens.push({ type: "openbracket"         }); continue; }
        if (char === "]")  { flush(); tokens.push({ type: "closebracket"        }); continue; }
        if (char === "{")  { flush(); tokens.push({ type: "openbrace"           }); continue; }
        if (char === "}")  { flush(); tokens.push({ type: "closebrace"          }); continue; }
        if (char === "\n") { flush(); tokens.push({ type: "newline"             }); continue; }
        if (char === '"')  { flush(); tokens.push({ type: "quote"               }); continue; }
        if (char === "`")  { flush(); tokens.push({ type: "backtick"            }); continue; }
        if (char === "\\") { flush(); tokens.push({ type: "backslash"           }); continue; }
        if (char === "|")  { flush(); tokens.push({ type: "pipe"                }); continue; }

        runningText += char;
    
    }
    flush();
    return tokens;
}