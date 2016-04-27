/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import type {
  Node, GenericMessage
} from './schema';

import {
  message,
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
      let keyContext = new Context(
        key,
        message('While validating key:', key),
        this
      );
      let res = validate(context, key, keyContext);
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
        message('While validating value at index:', String(i)),
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

  withMessage(message) {
    if (this.message === null) {
      return new Context(this.value, message, this.parent);
    } else {
      return new Context(this.value, message, this);
    }
  }
}

let NULL_CONTEXT = new Context(null);

export function validate(schema: Node, value: any): any {
  let context = new Context(value);
  return schema.validate(context).value;
}
