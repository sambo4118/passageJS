export function convertSyntax(tokens) {
    const result = [];
    let index = -1;
    let state = {};

    const convertToText = (token) => {
        if (token.type === "text")              return token.value;
        if (token.type === "newline")           return "\n";
        if (token.type === "quote")             return '"';
        if (token.type === "backtick")          return "`";
        if (token.type === "at")                return "@";
        if (token.type === "openparenthesis")   return "(";
        if (token.type === "closeparenthesis")  return ")";
        if (token.type === "openbracket")       return "[";
        if (token.type === "closebracket")      return "]";
        if (token.type === "openbrace")         return "{";
        if (token.type === "closebrace")        return "}";
        if (token.type === "pipe")              return "|";
        if (token.type === "dollar")            return "$";
        return "";
    }

    while (index < tokens.length - 1) {
        index++;
        const token = tokens[index];
        state = {tokens, index};

        if (token.type === "backslash") {
            const nextToken = tokens[index + 1];
            result.push({type: "text", value: convertToText(nextToken)});
            index++;
            continue;
        }

        if (token.type === "at") {
            const atConversion = convertAt(state);
            result.push(atConversion.result);
            index = atConversion.index;
            continue;
        }

        if (token.type === "text") {
            result.push({type: "text", value: token.value});
            continue;
        }
        
        if (token.type === "newline") {
            result.push({type: "newline"});
            continue;
        }

        if (token.type === "backtick") {
            while (tokens[index + 1] && tokens[index + 1].type !== "backtick") {
                index++;
                result.push({type: "text", value: convertToText(tokens[index])});
            }
            if (tokens[index + 1]?.type === "backtick") index++;
            continue;
        }

        if (token.type === "openbracket") {
            let location = [];
            let display = [];
            let isLocation = false;

            while (tokens[index + 1] && tokens[index + 1].type !== "closebracket") {
                
                if (tokens[index + 1].type === "pipe") {
                    isLocation = true;
                    index++;
                    continue;
                }
                if (isLocation) {
                    location.push(tokens[index + 1]);
                } else {
                    display.push(tokens[index + 1]);
                }
                index++;
            }

            result.push({type: "link", location: convertSyntax(location), display: convertSyntax(display)});
            if (tokens[index + 1]?.type === "closebracket") index++;
            continue;
        }

        if (token.type === "dollar") {
            let variableName = "";
            while (tokens[index + 1] && tokens[index + 1].type === "openbracket") {
                index++;
                variableName += convertToText(tokens[index]);
            }
            result.push({type: "varreference", value: [{type: "text", value: variableName}]});
        }
    }

    return result;
}

function convertAt(state) {
    let {tokens, index} = state;
    const result = {type: "at"};
    const trimtoken = () => {
        if (tokens[index + 1]?.type === "text" && tokens[index + 1].value.trim() === "") index++;
    };

    if (tokens[index + 1]?.type === "text" && !tokens[index + 1].value.trim().includes(" ")) {
        result.name = tokens[index + 1].value.trim();
        index++;
    } else {
        result.name = false;
    }

    if (tokens[index + 1]?.type === "openparenthesis") {
        index++;
        const tempLex = [];
        let depth = 1;
        while (tokens[index + 1] && depth > 0) {
            const nextToken = tokens[index + 1];
            if (nextToken.type === "openparenthesis") depth++;
            if (nextToken.type === "closeparenthesis") {
                depth--;
                if (depth === 0) {
                    index++;
                    break;
                }
            }
            if (depth > 0) tempLex.push(nextToken);
            index++;
        }
        if (depth !== 0) return {result: {type: "text", value: "@" + (result.name || "")}, index};
        result.args = convertSyntax(tempLex);
    } else {
        result.args = false;
    }

    trimtoken();
    if (tokens[index + 1]?.type === "openbrace") {
        index++;
        const tempLex = [];
        let depth = 1;
        while (tokens[index + 1] && depth > 0) {
            const nextToken = tokens[index + 1];
            if (nextToken.type === "openbrace") depth++;
            if (nextToken.type === "closebrace") {
                depth--;
                if (depth === 0) {
                    index++;
                    break;
                }
            }
            if (depth > 0) tempLex.push(nextToken);
            index++;
        }
        if (depth !== 0) return {result: {type: "text", value: "@" + (result.name || "")}, index};
        result.body = convertSyntax(tempLex);
    } else {
        result.body = false;
    }

    return {result, index};
}
