/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import invariant from 'invariant';

export type NodeSpec
  = {type: 'boolean'}
  | {type: 'string'}
  | {type: 'number'}
  | {type: 'any'}
  | {type: 'maybe', value: NodeSpec}
  | {type: 'mapping', value: NodeSpec}
  | {type: 'sequence', value: NodeSpec}
  | {type: 'object', values: {[key: string]: NodeSpec}, defaults: {[key: string]: any}}

export type Context = {

  buildMapping(validateValue: (context: Context, key: string) => ValidateResult): ValidateResult;
  buildSequence(validateValue: (context: Context) => ValidateResult): ValidateResult;
  unwrap(validate: (value: any) => any): ValidateResult;
};

type ValidateResult = {context: Context; value: any};

export class ValidationError extends Error {

  isValidationError: boolean;

  constructor(message: string) {
    super(message);
    this.isValidationError = true;
  }
}

export class Node {

  validate(_context: Context) {
    let message = `${this.constructor.name}.validate(context) is not implemented`;
    throw new ValidationError(message);
  }
}

class AnyNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (value == null) {
        throw new ValidationError(`expected a value but got: ${value === null ? 'null' : 'undefined'}`);
      }
      return value;
    });
  }
}

export let any = new AnyNode();

class MappingNode extends Node {

  valueNode: Node;

  constructor(valueNode: Node = any) {
    super();
    this.valueNode = valueNode;
  }

  validate(context: Context) {
    return context.buildMapping(context => this.valueNode.validate(context));
  }
}

export function mapping(valueNode: Node) {
  return new MappingNode(valueNode);
}

class ObjectNode extends Node {

  values: {[name: string]: Node};
  valuesKeys: Array<string>;
  defaults: Object;

  constructor(values: {[name: string]: Node}, defaults: Object = {}) {
    super();
    this.values = values;
    this.valuesKeys = Object.keys(values);
    this.defaults = defaults;
  }

  validate(context: Context) {
    let res = context.buildMapping((context, key) => {
      if (this.values[key] === undefined) {
        throw new ValidationError(`unexpected key ${key}`);
      }
      return this.values[key].validate(context);
    });
    let value = res.value;
    for (let key in this.values) {
      if (this.values.hasOwnProperty(key)) {
        if (value[key] === undefined) {
          if (this.defaults[key] === undefined) {
            throw new ValidationError(`missing key ${key}`);
          } else {
            value[key] = this.defaults[key];
          }
        }
      }
    }
    return {...res, value};
  }
}

export function object(values: {[name: string]: Node}, defaults: {[name: string]: any}) {
  return new ObjectNode(values, defaults);
}

class SequenceNode extends Node {

  valueNode: Node;

  constructor(valueNode: Node = any) {
    super();
    this.valueNode = valueNode;
  }

  validate(context: Context) {
    return context.buildSequence(context => this.valueNode.validate(context));
  }
}

export function sequence(valueNode: Node) {
  return new SequenceNode(valueNode);
}

class MaybeNode extends Node {

  valueNode: Node;

  constructor(valueNode: Node) {
    super();
    this.valueNode = valueNode;
  }

  validate(context: Context) {
    return context.unwrap(value => {
      if (value == null) {
        return null;
      }
      return this.valueNode.validate(context).value;
    });
  }
}

export function maybe(valueNode: Node) {
  return new MaybeNode(valueNode);
}

class EnumerationNode extends Node {

  values: Array<any>;

  constructor(values: Array<any>) {
    super();
    this.values = values;
  }

  validate(context: Context) {
    return context.unwrap(value => {
      for (let i = 0; i < this.values.length; i++) {
        if (value === this.values[i]) {
          return value;
        }
      }
      let expectation = this.values.map(v => JSON.stringify(v)).join(', ');
      throw new ValidationError(
        `expected value to be one of: ${expectation} but got: ${JSON.stringify(value)}`
      );
    });
  }
}

export function enumeration(...values: Array<any>) {
  return new EnumerationNode(values);
}

class OneOfNode extends Node {

  nodes: Array<Node>;

  constructor(nodes: Array<Node>) {
    super();
    this.nodes = nodes;
  }

  validate(context: Context) {
    let errors = [];
    for (let i = 0; i < this.nodes.length; i++) {
      try {
        return this.nodes[i].validate(context);
      } catch (error) {
        if (error.isValidationError) {
          errors.push(error);
          continue;
        } else {
          throw error;
        }
      }
    }
    invariant(
      errors.length > 0,
      'Impossible happened'
    );
    throw new ValidationError(errors.map(error => error.message).join(', '));
  }
}

export function oneOf(...nodes: Array<Node>) {
  return new OneOfNode(nodes);
}

class StringNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (typeof value !== 'string') {
        throw new ValidationError(`expected string but got: ${typeof value}`);
      }
      return value;
    });
  }
}

export let string = new StringNode();

class NumberNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (typeof value !== 'number') {
        throw new ValidationError(`expected number but got: ${typeof value}`);
      }
      return value;
    });
  }
}

export let number = new NumberNode();

class BooleanNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (typeof value !== 'boolean') {
        throw new ValidationError(`expected boolean but got: ${typeof value}`);
      }
      return value;
    });
  }
}

export let boolean = new BooleanNode();

export function parse(spec: NodeSpec): Node {
  switch (spec.type) {
    case 'boolean': {
      return boolean;
    }
    case 'string': {
      return string;
    }
    case 'number': {
      return number;
    }
    case 'any': {
      return any;
    }
    case 'maybe': {
      return maybe(parse(spec.value));
    }
    case 'mapping': {
      return mapping(parse(spec.value));
    }
    case 'sequence': {
      return sequence(parse(spec.value));
    }
    case 'object': {
      let values = {};
      for (let key in spec.values) {
        if (spec.values.hasOwnProperty(key)) {
          values[key] = parse(spec.values[key]);
        }
      }
      return object(values, spec.defaults);
    }
    default: {
      invariant(
        false,
        'Unable to parse schema, unknown type: %s', spec.type
      );
    }
  }
}
