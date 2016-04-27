/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import invariant from 'invariant';
import indent from 'indent-string';

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

  buildMapping(validateValue: (context: Context, key: string, keyContext: Context) => ValidateResult): ValidateResult;
  buildSequence(validateValue: (context: Context) => ValidateResult): ValidateResult;
  unwrap(validate: (value: any) => any): ValidateResult;
  error(message: Message | string): void;
};

export type ValidateResult = {context: Context; value: any};

export class Message {

  message: ?string;
  children: Array<Message | string>;

  constructor(message: ?string, children: Array<Message | string> = []) {
    this.message = message;
    this.children = children;
  }

  toString() {
    if (this.message === null) {
      return this.children.map(m => m.toString()).join('\n');
    } else {
      return [this.message]
        .concat(this.children.map(m => indent(m.toString(), '  ', 1)))
        .join('\n');
    }
  }
}

export function message(message: ?string, children: string | Message | Array<Message | string> = []) {
  if (!Array.isArray(children)) {
    children = [children];
  }
  return new Message(message, children);
}

export function ValidationError(message: Message | string) {
  // $FlowIssue: ...
  Error.call(this, message);
  this.message = message;
}
ValidationError.prototype = new Error();
// $FlowIssue: ...
ValidationError.prototype.constructor = ValidationError;
ValidationError.prototype.toString = function toString() {
  return this.message.toString();
};

export class Node {

  validate(_context: Context): ValidateResult {
    let message = `${this.constructor.name}.validate(context) is not implemented`;
    throw new Error(message);
  }
}

export class AnyNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (value == null) {
        context.error(message(
          'Expected a value but got:',
          value === null ? 'null' : 'undefined'
        ));
      }
      return value;
    });
  }
}

export let any = new AnyNode();

export class MappingNode extends Node {

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

export class ObjectNode extends Node {

  values: {[name: string]: Node};
  valuesKeys: Array<string>;
  defaults: Object;

  constructor(values: {[name: string]: Node}, defaults: ?Object = {}) {
    super();
    this.values = values;
    this.valuesKeys = Object.keys(values);
    this.defaults = defaults || {};
  }

  validate(context: Context) {
    let res = context.buildMapping((valueContext, key, keyContext) => {
      if (this.values[key] === undefined) {
        keyContext.error(`Unexpected key: "${key}"`);
      }
      return this.values[key].validate(valueContext);
    });
    let value = res.value;
    for (let key in this.values) {
      if (this.values.hasOwnProperty(key)) {
        if (value[key] === undefined) {
          if (this.defaults[key] === undefined) {
            context.error(`Missing key: "${key}"`);
          } else {
            value[key] = this.defaults[key];
          }
        }
      }
    }
    return {...res, value};
  }
}

export function object(values: {[name: string]: Node}, defaults: ?Object) {
  return new ObjectNode(values, defaults);
}

export class SequenceNode extends Node {

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

export class MaybeNode extends Node {

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

export class EnumerationNode extends Node {

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
      context.error(message(
        null, [
          message('Expected value to be one of:', expectation),
          message('But got:', JSON.stringify(value))
        ]
      ));
    });
  }
}

export function enumeration(...values: Array<any>) {
  return new EnumerationNode(values);
}

export class OneOfNode extends Node {

  nodes: Array<Node>;

  constructor(nodes: Array<Node>) {
    super();
    this.nodes = nodes;
  }

  // $FlowIssue: can't infer termination due exception
  validate(context: Context): ValidateResult {
    let errors = [];
    for (let i = 0; i < this.nodes.length; i++) {
      try {
        return this.nodes[i].validate(context);
      } catch (error) {
        if (error instanceof ValidationError) {
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
    let messages = [''];
    errors.forEach(error => {
      messages.push(error.message);
      messages.push('');
    });
    context.error(message('Either:', messages));
  }
}

export function oneOf(...nodes: Array<Node>) {
  return new OneOfNode(nodes);
}

export class StringNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (typeof value !== 'string') {
        context.error(message(null, [
          message('Expected value of type:', 'string'),
          message('Found value of type:', typeof value),
        ]));
      }
      return value;
    });
  }
}

export let string = new StringNode();

export class NumberNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (typeof value !== 'number') {
        context.error(message(null, [
          message('Expected value of type:', 'number'),
          message('Found value of type:', typeof value),
        ]));
      }
      return value;
    });
  }
}

export let number = new NumberNode();

export class BooleanNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (typeof value !== 'boolean') {
        context.error(message(null, [
          message('Expected value of type:', 'boolean'),
          message('Found value of type:', typeof value),
        ]));
      }
      return value;
    });
  }
}

export let boolean = new BooleanNode();

export class RefNode extends Node {

  node: ?Node;

  constructor() {
    super();
    this.node = null;
  }

  validate(context: Context): ValidateResult {
    invariant(
      this.node != null,
      'Trying to validate with an unitialized ref'
    );
    return this.node.validate(context);
  }

  set(node: Node): void {
    this.node = node;
  }
}

export function ref() {
  return new RefNode();
}
