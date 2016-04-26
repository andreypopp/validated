/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import type {Node} from './schema';
import {
  ValidationError,
  message
} from './schema';

function isObject(obj) {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}

class Context {

  value: any;
  description: string;
  parent: ?Context;

  constructor(value, description: ?string, parent: ?Context = null) {
    this.value = value;
    this.description = description;
    this.parent = parent;
  }

  buildMapping(validate) {
    if (!isObject(this.value)) {
      this.error(message(`Expected a mapping but got: ${typeOf(this.value)}`));
    }
    let keys = Object.keys(this.value);
    let value = {};
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let context = new Context(
        this.value[key],
        message('While validating key:', key),
        this
      );
      let res = validate(context, key);
      value[key] = res.value;
    }
    return {value, context: NULL_CONTEXT};
  }

  buildSequence(validate) {
    if (!Array.isArray(this.value)) {
      this.error(message(`Expected an array but got: ${typeOf(this.value)}`));
    }
    let value: Array<any> = [];
    for (let i = 0; i < this.value.length; i++) {
      let context = new Context(
        this.value[i],
        message('While validating value at index:', i),
        this
      );
      let res = validate(context);
      value[i] = res.value;
    }
    return {value, context: NULL_CONTEXT};
  }

  unwrap(validate) {
    let value = validate(this.value);
    return {value, context: NULL_CONTEXT};
  }

  error(msg) {
    let context = this;
    let messages = [msg];
    do {
      if (context.description) {
        messages.push(context.description);
      }
      context = context.parent;
    } while (context);
    throw new ValidationError(message(null, messages));
  }
}

let NULL_CONTEXT = new Context(null);

export function validate(schema: Node, value: any): any {
  let context = new Context(value);
  return schema.validate(context).value;
}

function typeOf(value) {
  if (value === null) {
    return 'null';
  } else if (Array.isArray(value)) {
    return 'array';
  } else {
    return typeof value;
  }
}
