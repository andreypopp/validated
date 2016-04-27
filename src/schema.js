/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import invariant from 'invariant';
import indent from 'indent-string';
import {typeOf} from './utils';

export type NodeSpec
  = {type: 'boolean'}
  | {type: 'string'}
  | {type: 'number'}
  | {type: 'any'}
  | {type: 'maybe', value: NodeSpec}
  | {type: 'mapping', value: NodeSpec}
  | {type: 'sequence', value: NodeSpec}
  | {type: 'object', values: {[key: string]: NodeSpec}, defaults: {[key: string]: any}}

export type ValidateResult = {context: Context; value: any};
export type GenericMessage = Message | string;

export class Context {

  parent: ?Context;
  message: ?GenericMessage;

  constructor(message: ?GenericMessage = null, parent: ?Context = null) {
    this.message = message;
    this.parent = parent;
  }

  buildMapping(_validateValue: (context: Context, key: string, keyContext: Context) => ValidateResult): ValidateResult {
    throw new Error('not implemented');
  }

  buildSequence(_validateValue: (context: Context) => ValidateResult): ValidateResult {
    throw new Error('not implemented');
  }

  unwrap(_validate: (value: any) => any): ValidateResult {
    throw new Error('not implemented');
  }

  buildMessage(originalMessage: GenericMessage, _contextMessages: Array<GenericMessage>): GenericMessage {
    return originalMessage;
  }

  withMessage(_message: GenericMessage): Context {
    throw new Error('not implemented');
  }

  error(originalMessage: GenericMessage): void {
    let context = this;
    let contextMessages = [];
    do {
      if (context.message) {
        contextMessages.push(context.message);
      }
      context = context.parent;
    } while (context);
    originalMessage = this.buildMessage(originalMessage, contextMessages);
    throw new ValidationError(originalMessage, contextMessages);
  }
}

class NullContext extends Context {

  // $FlowIssue: ...
  buildMapping(_validateValue) {
    this.error('Expected a mapping value but got undefined');
  }

  // $FlowIssue: ...
  buildSequence(_validateValue) {
    this.error('Expected an array value but got undefined');
  }

  unwrap(validate) {
    let value = validate(undefined);
    return {value, context: this};
  }
}

export class Message {

  message: ?string;
  children: Array<GenericMessage>;

  constructor(message: ?string, children: Array<GenericMessage> = []) {
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

class AlternativeMessage extends Message {

  static DESCRIPTION = 'Either:';

  constructor(children) {
    super(AlternativeMessage.DESCRIPTION, children);
  }
}

export function message(message: ?string, children: GenericMessage | Array<GenericMessage> = []) {
  if (!Array.isArray(children)) {
    children = [children];
  }
  return new Message(message, children);
}

export function ValidationError(originalMessage: GenericMessage, contextMessages: Array<GenericMessage>) {
  // $FlowIssue: ...
  let message = [originalMessage].concat(contextMessages).join('\n');
  Error.call(this, message);
  this.message = message;
  this.originalMessage = originalMessage;
  this.contextMessages = contextMessages;
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
        let repr = value === null ? 'null' : 'undefined';
        context.error(`Expected a value but got ${repr}`);
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
    context = context.withMessage('While validating object');
    let res = context.buildMapping((valueContext, key, keyContext) => {
      if (this.values[key] === undefined) {
        keyContext.error(`Unexpected key: "${key}"`);
      }
      let value = this.values[key].validate(valueContext);
      return value;
    });
    let value = res.value;
    for (let key in this.values) {
      if (this.values.hasOwnProperty(key)) {
        if (value[key] === undefined) {
          if (this.defaults[key] === undefined) {
            let nullContext = new NullContext(
              `While validating value at key "${key}"`,
              context);
            let {value: missingValue} = this.values[key].validate(nullContext);
            if (missingValue !== undefined) {
              value[key] = missingValue;
            }
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
        return value;
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
      let repr = JSON.stringify(value);
      context.error(`Expected value to be one of ${expectation} but got ${repr}`);
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
    throw optimizeAlternativeError(errors);
  }
}

export function oneOf(...nodes: Array<Node>) {
  return new OneOfNode(nodes);
}

function optimizeAlternativeError(errors) {
  let sections = errors
    .map(error =>
      [error.originalMessage].concat(error.contextMessages))
    .map(lines => {
      lines = lines.slice(0);
      lines.reverse();
      return lines;
    });
  let different = [];
  let same = [];
  for (let i = 0; true; i++) {
    if (sections.every(lines => lines[i] === undefined)) {
      break;
    }
    if (sections.reduce((a, b) => a[i] === b[i])) {
      same.unshift(sections[0][i]);
    } else {
      sections.forEach(lines => {
        let alternative = [];
        lines = lines.slice(same.length);
        lines.reverse();
        lines.forEach(line => {
          if (line instanceof AlternativeMessage) {
            alternative = alternative.concat(line.children);
          } else {
            alternative.push(line);
          }
        });
        different.push(message(null, alternative));
        different.push('');
      });
      break;
    }
  }
  different.pop();
  different.push('');
  return new ValidationError(new AlternativeMessage(different), same);
}

export class StringNode extends Node {

  validate(context: Context) {
    return context.unwrap(value => {
      if (typeof value !== 'string') {
        context.error(`Expected value of type string but got ${typeOf(value)}`);
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
        context.error(`Expected value of type number but got ${typeOf(value)}`);
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
        context.error(`Expected value of type boolean but got ${typeOf(value)}`);
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
