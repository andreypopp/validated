// json5.js
// Modern JSON. See README.md for details.
//
// This file is based directly off of Douglas Crockford's json_parse.js:
// https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js

import {
  Context as ContextBase
} from './schema';
import {
  typeOf
} from './utils';

var parse = (function () {
    "use strict";

    function location(state) {
      return `line ${state.lineNumber} column ${state.columnNumber - 1}`;
    }

    class Context extends ContextBase {

      constructor(state, message = null, parent = null) {
        if (message) {
          message = `${message} (${location(state)})`;
        }
        super(message, parent);
        this.state = state;
      }

      buildMapping(validateValue) {
        let state = white(this.state);
        if (state.ch !== '{') {
          let {value: val} = value(state);
          this.error(`Expected a mapping but got ${typeOf(val)}`);
        } else {
          let {value: val, state: nextState} = object(state, (key, valueState, keyState) => {
            valueState = white(valueState);
            let valueContext = new Context(
              valueState,
              `While validating value at key "${key}"`,
              this
            );
            let keyContext = new Context(
              keyState,
              `While validating key "${key}"`,
              this
            );
            let {context, value} = validateValue(valueContext, key, keyContext);
            return {state: context.state, value};
          });
          return {
            value: val,
            context: new Context(nextState),
          };
        }
      }

      buildSequence(validateValue) {
        let state = white(this.state);
        if (state.ch !== '[') {
          let {value: val} = value(state);
          this.error(`Expected an array but got ${typeOf(val)}`);
        } else {
          let {value: val, state: nextState} = array(state, (idx, valueState) => {
            valueState = white(valueState);
            let valueContext = new Context(
              valueState,
              `While validating value at index ${idx}`,
              this
            );
            let {context, value} = validateValue(valueContext);
            return {state: context.state, value};
          });
          return {
            value: val,
            context: new Context(nextState),
          }
        };
      }

      buildMessage(originalMessage, contextMessages) {
        if (contextMessages.length === 0) {
          return `${originalMessage} (${location(this.state)})`;
        } else {
          return originalMessage;
        }
      }

      unwrap(validate) {
        let {state, value: val} = value(white(this.state));
        val = validate(val);
        return {
          value: val,
          context: new Context(state),
        };
      }
    }

// This is a function that can parse a JSON5 text, producing a JavaScript
// data structure. It is a simple, recursive descent parser. It does not use
// eval or regular expressions, so it can be used as a model for implementing
// a JSON5 parser in other languages.

// We are defining the function inside of another function to avoid creating
// global variables.

    var escapee = {
            "'":  "'",
            '"':  '"',
            '\\': '\\',
            '/':  '/',
            '\n': '',       // Replace escaped newlines in strings w/ empty string
            b:    '\b',
            f:    '\f',
            n:    '\n',
            r:    '\r',
            t:    '\t'
        },
        ws = [
            ' ',
            '\t',
            '\r',
            '\n',
            '\v',
            '\f',
            '\xA0',
            '\uFEFF'
        ],

        renderChar = function (chr) {
            return chr === '' ? 'EOF' : "'" + chr + "'";
        },

        error = function (m, state) {
// Call error when something is wrong.

            var error = new SyntaxError();
            // beginning of message suffix to agree with that provided by Gecko - see https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
            error.message = m + " at line " + state.lineNumber + " column " + state.columnNumber + " of the JSON5 data. Still to read: " + JSON.stringify(state.text.substring(state.at - 1, state.at + 19));
            error.at = state.at;
            // These two property names have been chosen to agree with the ones in Gecko, the only popular
            // environment which seems to supply this info on JSON.parse
            error.lineNumber = state.lineNumber;
            error.columnNumber = state.columnNumber;
            throw error;
        },

        next = function (c, state) {
            var nextState = Object.assign({}, state);
// If a c parameter is provided, verify that it matches the current character.

            if (c && c !== state.ch) {
                error("Expected " + renderChar(c) + " instead of " + renderChar(state.ch), state);
            }

// Get the next character. When there are no more characters,
// return the empty string.

            nextState.ch = state.text.charAt(state.at);
            nextState.at = state.at + 1;
            nextState.columnNumber = state.columnNumber + 1;
            if (nextState.ch === '\n' || nextState.ch === '\r' && peek(nextState) !== '\n') {
                nextState.lineNumber = state.lineNumber + 1;
                nextState.columnNumber = 0;
            }
            return nextState;
        },

        peek = function (state) {
// Get the next character without consuming it or
// assigning it to the ch varaible.

            return state.text.charAt(state.at);
        },

        identifier = function (state) {
// Parse an identifier. Normally, reserved words are disallowed here, but we
// only use this for unquoted object keys, where reserved words are allowed,
// so we don't check for those here. References:
// - http://es5.github.com/#x7.6
// - https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Core_Language_Features#Variables
// - http://docstore.mik.ua/orelly/webprog/jscript/ch02_07.htm
// TODO Identifiers can have Unicode "letters" in them; add support for those.

            var key = state.ch;

            // Identifiers must start with a letter, _ or $.
            if ((state.ch !== '_' && state.ch !== '$') &&
                    (state.ch < 'a' || state.ch > 'z') &&
                    (state.ch < 'A' || state.ch > 'Z')) {
                error("Bad identifier as unquoted key", state);
            }

            // Subsequent characters can contain digits.
            while ((state = next(undefined, state)) && state.ch && (
                    state.ch === '_' || state.ch === '$' ||
                    (state.ch >= 'a' && state.ch <= 'z') ||
                    (state.ch >= 'A' && state.ch <= 'Z') ||
                    (state.ch >= '0' && state.ch <= '9'))) {
                key += state.ch;
            }

            return {state: state, value: key};
        },

        number = function (state) {
// Parse a number value.

            var number,
                sign = '',
                string = '',
                base = 10;

            if (state.ch === '-' || state.ch === '+') {
                sign = state.ch;
                state = next(state.ch, state);
            }

            // support for Infinity (could tweak to allow other words):
            if (state.ch === 'I') {
                var valueAndState = word(state);
                number = valueAndState.value;
                state = valueAndState.state;
                if (typeof number !== 'number' || isNaN(number)) {
                    error('Unexpected word for number', state);
                }
                return {state: state, value: (sign === '-') ? -number : number};
            }

            // support for NaN
            if (state.ch === 'N') {
              var valueAndState = word(state);
              number = valueAndState.value;
              state = valueAndState.state;
              if (!isNaN(number)) {
                error('expected word to be NaN', state);
              }
              // ignore sign as -NaN also is NaN
              return {state: state, value: number};
            }

            if (state.ch === '0') {
                string += state.ch;
                state = next(undefined, state);
                if (state.ch === 'x' || state.ch === 'X') {
                    string += state.ch;
                    state = next(undefined, state);
                    base = 16;
                } else if (state.ch >= '0' && state.ch <= '9') {
                    error('Octal literal', state);
                }
            }

            switch (base) {
            case 10:
                while (state.ch >= '0' && state.ch <= '9' ) {
                    string += state.ch;
                    state = next(undefined, state);
                }
                if (state.ch === '.') {
                    string += '.';
                    while ((state = next(undefined, state)) && state.ch && state.ch >= '0' && state.ch <= '9') {
                        string += state.ch;
                    }
                }
                if (state.ch === 'e' || state.ch === 'E') {
                    string += state.ch;
                    state = next(undefined, state);
                    if (state.ch === '-' || state.ch === '+') {
                        string += state.ch;
                        state = next(undefined, state);
                    }
                    while (state.ch >= '0' && state.ch <= '9') {
                        string += state.ch;
                        state = next(undefined, state);
                    }
                }
                break;
            case 16:
                while (state.ch >= '0' && state.ch <= '9' || state.ch >= 'A' && state.ch <= 'F' || state.ch >= 'a' && state.ch <= 'f') {
                    string += state.ch;
                    state = next(undefined, state);
                }
                break;
            }

            if(sign === '-') {
                number = -string;
            } else {
                number = +string;
            }

            if (!isFinite(number)) {
                error("Bad number", state);
            } else {
                return {state: state, value: number};
            }
        },

        string = function (state) {

// Parse a string value.

            var hex,
                i,
                string = '',
                delim,      // double quote or single quote
                uffff;

// When parsing for string values, we must look for ' or " and \ characters.

            if (state.ch === '"' || state.ch === "'") {
                delim = state.ch;
                while ((state = next(undefined, state))) {
                    if (state.ch === delim) {
                        state = next(undefined, state);
                        return {state: state, value: string};
                    } else if (state.ch === '\\') {
                        state = next(undefined, state);
                        if (state.ch === 'u') {
                            uffff = 0;
                            for (i = 0; i < 4; i += 1) {
                                state = next(undefined, state);
                                hex = parseInt(state.ch, 16);
                                if (!isFinite(hex)) {
                                    break;
                                }
                                uffff = uffff * 16 + hex;
                            }
                            string += String.fromCharCode(uffff);
                        } else if (state.ch === '\r') {
                            if (peek(state) === '\n') {
                                state = next(undefined, state);
                            }
                        } else if (typeof escapee[state.ch] === 'string') {
                            string += escapee[state.ch];
                        } else {
                            break;
                        }
                    } else if (state.ch === '\n') {
                        // unescaped newlines are invalid; see:
                        // https://github.com/aseemk/json5/issues/24
                        // TODO this feels special-cased; are there other
                        // invalid unescaped chars?
                        break;
                    } else {
                        string += state.ch;
                    }
                }
            }
            error("Bad string", state);
        },

        inlineComment = function (state) {

// Skip an inline comment, assuming this is one. The current character should
// be the second / character in the // pair that begins this inline comment.
// To finish the inline comment, we look for a newline or the end of the text.

            if (state.ch !== '/') {
                error("Not an inline comment", state);
            }

            do {
                state = next(undefined, state);
                if (state.ch === '\n' || state.ch === '\r') {
                    state = next(undefined, state);
                    return state;
                }
            } while (state.ch);

            return state;
        },

        blockComment = function (state) {

// Skip a block comment, assuming this is one. The current character should be
// the * character in the /* pair that begins this block comment.
// To finish the block comment, we look for an ending */ pair of characters,
// but we also watch for the end of text before the comment is terminated.

            if (state.ch !== '*') {
                error("Not a block comment", state);
            }

            do {
                state = next(undefined, state);
                while (state.ch === '*') {
                    state =next('*', state);
                    if (state.ch === '/') {
                        state = next('/', state);
                        return state;
                    }
                }
            } while (state.ch);

            error("Unterminated block comment");
        },

        comment = function (state) {

// Skip a comment, whether inline or block-level, assuming this is one.
// Comments always begin with a / character.

            if (state.ch !== '/') {
                error("Not a comment");
            }

            state = next('/', state);

            if (state.ch === '/') {
                state = inlineComment(state);
            } else if (state.ch === '*') {
                state = blockComment(state);
            } else {
                error("Unrecognized comment");
            }

            return state;
        },

        white = function (state) {

// Skip whitespace and comments.
// Note that we're detecting comments by only a single / character.
// This works since regular expressions are not valid JSON(5), but this will
// break if there are other valid values that begin with a / character!

            while (state.ch) {
                if (state.ch === '/') {
                    state = comment(state);
                } else if (ws.indexOf(state.ch) >= 0) {
                    state = next(undefined, state);
                } else {
                    return state;
                }
            }

            return state;
        },

        word = function (state) {

// true, false, or null.

            switch (state.ch) {
            case 't':
                state = next('t', state);
                state = next('r', state);
                state = next('u', state);
                state = next('e', state);
                return {state: state, value: true};
            case 'f':
                state = next('f', state);
                state = next('a', state);
                state = next('l', state);
                state = next('s', state);
                state = next('e', state);
                return {state: state, value: false};
            case 'n':
                state = next('n', state);
                state = next('u', state);
                state = next('l', state);
                state = next('l', state);
                return {state: state, value: null};
            case 'I':
                state = next('I', state);
                state = next('n', state);
                state = next('f', state);
                state = next('i', state);
                state = next('n', state);
                state = next('i', state);
                state = next('t', state);
                state = next('y', state);
                return {state: state, value: Infinity};
            case 'N':
                state = next('N', state);
                state = next('a', state);
                state = next('N', state);
                return {state: state, value: NaN};
            }
            error("Unexpected " + renderChar(state.ch), state);
        },

        value,  // Place holder for the value function.

        array = function (state, continuation) {

// Parse an array value.

            var array = [];
            var idx = 0;

            if (state.ch === '[') {
                state = next('[', state);
                state = white(state);
                while (state.ch) {
                    if (state.ch === ']') {
                        state = next(']', state);
                        return {state: state, value: array};   // Potentially empty array
                    }
                    // ES5 allows omitting elements in arrays, e.g. [,] and
                    // [,null]. We don't allow this in JSON5.
                    if (state.ch === ',') {
                        error("Missing array element");
                    } else {
                        if (continuation) {
                          let res = continuation(idx, state);
                          array.push(res.value);
                          state = res.state;
                        } else {
                          var valueAndState = value(state);
                          array.push(valueAndState.value);
                          state = valueAndState.state;
                        }
                        idx = idx + 1;
                    }
                    state = white(state);
                    // If there's no comma after this value, this needs to
                    // be the end of the array.
                    if (state.ch !== ',') {
                        state = next(']', state);
                        return {state: state, value: array};
                    }
                    state = next(',', state);
                    state = white(state);
                }
            }
            error("Bad array");
        },

        object = function (state, continuation) {

// Parse an object value.

            var key,
                object = {};

            if (state.ch === '{') {
                state = next('{', state);
                state = white(state);
                while (state.ch) {
                    if (state.ch === '}') {
                        state = next('}', state);
                        return {state: state, value: object};   // Potentially empty object
                    }

                    // Keys can be unquoted. If they are, they need to be
                    // valid JS identifiers.
                    var keyAndState;
                    let keyState = state;
                    if (state.ch === '"' || state.ch === "'") {
                        keyAndState = string(state);
                    } else {
                        keyAndState = identifier(state);
                    }
                    key = keyAndState.value;
                    state = keyAndState.state;

                    state = white(state);
                    state = next(':', state);
                    if (continuation) {
                      let res = continuation(key, state, keyState);
                      object[key] = res.value;
                      state = res.state;
                    } else {
                      var valueAndState = value(state);
                      object[key] = valueAndState.value;
                      state = valueAndState.state;
                    }
                    state = white(state);
                    // If there's no comma after this pair, this needs to be
                    // the end of the object.
                    if (state.ch !== ',') {
                        state = next('}', state);
                        return {state: state, value: object};
                    }
                    state = next(',', state);
                    state = white(state);
                }
            }
            error("Bad object", state);
        };

    value = function (state) {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

        state = white(state);
        switch (state.ch) {
        case '{':
            return object(state);
        case '[':
            return array(state);
        case '"':
        case "'":
            return string(state);
        case '-':
        case '+':
        case '.':
            return number(state);
        default:
            return state.ch >= '0' && state.ch <= '9' ? number(state) : word(state);
        }
    };

// Return the json_parse function. It will have access to all of the above
// functions and variables.

    return function (source, node) {
        var state = {
            at: 0,
            text: String(source),
            lineNumber: 1,
            columnNumber: 1,
            ch: ' '
        };
        if (node) {
          state = white(state);
          var context = new Context(state);
          var result = node.validate(context);
          state = result.context.state;
          result = result.value;
        } else {
          var resultAndState = value(state, context);
          var result = resultAndState.value;
          state = resultAndState.state;
        }
        state = white(state);
        if (state.ch) {
            error("Syntax error", state);
        }
        return result;
    };
}());

export function validate(schema, value) {
  return parse(value, schema);
}
