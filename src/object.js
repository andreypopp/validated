/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import type {Node} from './schema';
import {ValidationError} from './schema';

function isObject(obj) {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}

class Context {

  value: any;

  constructor(value) {
    this.value = value;
  }

  buildMapping(validate) {
    if (!isObject(this.value)) {
      this.error(`expected mapping but got: ${typeof this.value}`);
    }
    let keys = Object.keys(this.value);
    let value = {};
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let context = new this.constructor(this.value[key]);
      let res = validate(context, key);
      value[key] = res.value;
    }
    return {value, context: NULL_CONTEXT};
  }

  buildSequence(validate) {
    if (!Array.isArray(this.value)) {
      this.error(`expected sequence but got: ${typeof this.value}`);
    }
    let value: Array<any> = [];
    for (let i = 0; i < this.value.length; i++) {
      let context = new this.constructor(this.value[i]);
      let res = validate(context);
      value[i] = res.value;
    }
    return {value, context: NULL_CONTEXT};
  }

  unwrap(validate) {
    let value = validate(this.value);
    return {value, context: NULL_CONTEXT};
  }

  error(message) {
    throw new ValidationError(message);
  }
}

let NULL_CONTEXT = new Context(null);

export function validate(schema: Node, value: any): any {
  let context = new Context(value);
  return schema.validate(context).value;
}
