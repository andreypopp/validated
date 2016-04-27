/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import type {
  Context, ValidateResult
} from './schema';
import {
  ref, oneOf, enumeration, object, sequence, mapping,
  string, number, boolean, maybe, any,
  Node
} from './schema';

let schemaSchemaSelf = ref();
let schemaSchema = oneOf(
  enumeration('string', 'number', 'boolean', 'any'),
  object({maybe: schemaSchemaSelf}),
  object({mapping: schemaSchemaSelf}),
  object({sequence: schemaSchemaSelf}),
  object({object: schemaSchemaSelf, defaults: maybe(any)}),
);

class SchemaNode extends Node {

  // $FlowIssue: ...
  validate(context: Context): ValidateResult {
    let {value, context: nextContext} = schemaSchema.validate(context);
    if (typeof value === 'string') {
      switch (value) {
        case 'boolean': {
          return {value: boolean, context: nextContext};
        }
        case 'string': {
          return {value: string, context: nextContext};
        }
        case 'number': {
          return {value: number, context: nextContext};
        }
        case 'any': {
          return {value: any, context: nextContext};
        }
      }
    } else {
      if (value.maybe) {
        return {value: maybe(value.maybe), context: nextContext};
      } else if (value.mapping) {
        return {value: mapping(value.mapping), context: nextContext};
      } else if (value.sequence) {
        return {value: sequence(value.sequence), context: nextContext};
      } else if (value.object) {
        let values = {};
        for (let key in value.object) {
          if (value.object.hasOwnProperty(key)) {
            values[key] = value.object[key];
          }
        }
        let defaults = value.defaults || {};
        return {value: object(values, defaults), context: nextContext};
      }
    }
  }
}

export let schema = new SchemaNode;
schemaSchemaSelf.set(schema);
