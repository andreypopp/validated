/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import type {Node} from './schema';
import type {GenericMessage} from './message';

import {
  Context as ContextBase
} from './schema';
import {
  typeOf,
  isObject
} from './utils';

class Context extends ContextBase {

  value: any;
  message: ?GenericMessage;
  parent: ?ContextBase;

  constructor(value, message = null, parent = null) {
    super(message, parent);
    this.value = value;
  }

  buildMapping(validate) {
    if (!isObject(this.value)) {
      this.error(`Expected a mapping but got ${typeOf(this.value)}`);
    }
    let keys = Object.keys(this.value);
    let value = {};
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let valueContext = new Context(
        this.value[key],
        `While validating value at key "${key}"`,
        this
      );
      let keyContext = new Context(
        key,
      `While validating key "${key}"`,
        this
      );
      let res = validate(valueContext, key, keyContext);
      value[key] = res.value;
    }
    return {value, context: NULL_CONTEXT};
  }

  buildSequence(validate) {
    if (!Array.isArray(this.value)) {
      this.error(`Expected an array but got ${typeOf(this.value)}`);
    }
    let value: Array<any> = [];
    for (let i = 0; i < this.value.length; i++) {
      let context = new Context(
        this.value[i],
        `While validating value at index ${i}`,
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
}

let NULL_CONTEXT = new Context(null);

export function validate(schema: Node, value: any): any {
  let context = new Context(value);
  return schema.validate(context).value;
}
