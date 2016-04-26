/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

function isObject(obj) {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}

class Context {

  constructor(value) {
    this.value = value;
  }

  buildMapping(validate) {
    if (!isObject(this.value)) {
      throw new ValidationError(`expected mapping but got: ${typeof value}`);
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
      throw new ValidationError(`expected sequence but got: ${typeof this.value}`);
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
}

let NULL_CONTEXT = new Context(null);

export function validate(schema: Node, value: any): any {
  let context = new Context(value);
  return schema.validate(context).value;
}
