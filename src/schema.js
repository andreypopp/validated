/**
 * Serialization agnostic schema definition language.
 *
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import {AlternativeMessage, Message, message} from './message';
import {flatten, typeOf} from './utils';

import CustomError from 'custom-error-instance';
import type {GenericMessage} from './message';
import invariant from 'invariant';
import levenshtein from 'levenshtein-edit-distance';

export type NodeSpec =
  | {type: 'boolean'}
  | {type: 'string'}
  | {type: 'number'}
  | {type: 'any'}
  | {type: 'maybe', value: NodeSpec}
  | {type: 'mapping', value: NodeSpec}
  | {type: 'sequence', value: NodeSpec}
  | {type: 'object', values: {[key: string]: NodeSpec}, defaults: {[key: string]: any}};

export type ValidateResult<V> = {
  +context: Context,
  +value: V,
};

type Refine<A, B> = (value: A, error: (message: GenericMessage) => void) => B;

export class Context {
  parent: ?Context;
  message: ?GenericMessage;

  constructor(message: ?GenericMessage = null, parent: ?Context = null) {
    this.message = message;
    this.parent = parent;
  }

  buildMapping<V>(
    _validateValue: (
      context: Context,
      key: string,
      keyContext: Context,
    ) => ValidateResult<V>,
  ): ValidateResult<{[key: string]: V}> {
    throw new Error('not implemented');
  }

  buildSequence<V>(
    _validateValue: (context: Context) => ValidateResult<V>,
  ): ValidateResult<Array<V>> {
    throw new Error('not implemented');
  }

  unwrap<V>(_validate: (value: mixed) => V): ValidateResult<V> {
    throw new Error('not implemented');
  }

  buildMessage(
    originalMessage: ?GenericMessage,
    _contextMessages: Array<GenericMessage>,
  ) {
    return originalMessage;
  }

  error(inMessage: ?GenericMessage) {
    let context = this;
    let contextMessages = [];
    do {
      if (context.message) {
        contextMessages.push(context.message);
      }
      context = context.parent;
    } while (context);
    const originalMessage = this.buildMessage(inMessage, contextMessages);
    return validationError(originalMessage, contextMessages);
  }
}

class NullContext extends Context {
  buildMapping(_validateValue) {
    throw this.error('Expected a mapping value but got undefined');
  }

  buildSequence(_validateValue) {
    throw this.error('Expected an array value but got undefined');
  }

  unwrap<V>(validate: (value: mixed) => V): ValidateResult<V> {
    let value = validate(undefined);
    return {value, context: this};
  }

  buildMessage(originalMessage, contextMessages) {
    if (this.parent) {
      return this.parent.buildMessage(originalMessage, contextMessages);
    } else {
      return originalMessage;
    }
  }
}

export let ValidationError = CustomError('ValidationError');

ValidationError.prototype.toString = function() {
  return this.message;
};

ValidationError.prototype.withContext = function(...messages) {
  let error = validationError(
    this.originalMessage,
    this.contextMessages.concat(...messages),
  );
  return error;
};

export function validationError(
  originalMessage: ?GenericMessage,
  contextMessages: Array<GenericMessage>,
) {
  let messages = [originalMessage].concat(contextMessages);
  let message = messages.join('\n');
  return new ValidationError({message, messages, originalMessage, contextMessages});
}

export class Node<V> {
  validate(_context: Context): ValidateResult<V> {
    let message = `${this.constructor.name}.validate(context) is not implemented`;
    throw new Error(message);
  }

  andThen<RV>(refine: Refine<V, RV>): RefineNode<V, RV> {
    let node: RefineNode<V, RV> = new RefineNode(this, refine);
    return node;
  }
}

export class RefineNode<V, RV> extends Node<RV> {
  validator: Node<V>;
  refine: Refine<V, RV>;

  constructor(validator: Node<V>, refine: Refine<V, RV>) {
    super();
    this.validator = validator;
    this.refine = refine;
  }

  validate(context: Context): ValidateResult<RV> {
    let {value, context: nextContext} = this.validator.validate(context);
    let nextValue: RV = this.refine(value, context.error.bind(context));
    return {value: nextValue, context: nextContext};
  }
}

export class AnyNode<V: mixed> extends Node<$NonMaybeType<V>> {
  validate(context: Context): ValidateResult<$NonMaybeType<V>> {
    return context.unwrap(value => {
      if (value == null) {
        let repr = value === null ? 'null' : 'undefined';
        throw context.error(`Expected a value but got ${repr}`);
      }
      return value;
    });
  }
}

export let any: AnyNode<*> = new AnyNode();

export class ConstantNode<V> extends Node<V> {
  value: V;
  eq: (v1: mixed, v2: mixed) => boolean;

  constructor(value: V, eq: (v1: mixed, v2: mixed) => boolean) {
    super();
    this.value = value;
    this.eq = eq;
  }

  validate(context: Context): ValidateResult<V> {
    return context.unwrap(value => {
      if (!this.eq(value, this.value)) {
        throw context.error(
          `Expected ${JSON.stringify(this.value)} but got ${JSON.stringify(value)}`,
        );
      }
      return (value: any);
    });
  }
}

export function constant<V>(
  value: V,
  eq: (v1: mixed, v2: mixed) => boolean = (v1, v2) => v1 === v2,
): ConstantNode<V> {
  return new ConstantNode(value, eq);
}

type MappingOf<V> = {[key: string]: V};

export class MappingNode<V> extends Node<MappingOf<V>> {
  valueNode: Node<V>;

  constructor(valueNode: Node<V>) {
    super();
    this.valueNode = valueNode;
  }

  validate(context: Context): ValidateResult<MappingOf<V>> {
    return context.buildMapping(context => this.valueNode.validate(context));
  }
}

export function mapping<V>(valueNode?: Node<V> = any): MappingNode<V> {
  return new MappingNode(valueNode);
}

type ObjectNodeOptions = {
  allowExtra: boolean,
};

export class ObjectNode<S: {[name: string]: Node<*>}> extends Node<
  $ObjMap<S, <V>(v: Node<V>) => V>,
> {
  // eslint-disable-line no-undef

  values: S;
  valuesKeys: Array<string>;
  defaults: Object;
  options: ObjectNodeOptions;

  constructor(values: S, defaults: ?Object = {}, options: ObjectNodeOptions) {
    super();
    this.values = values;
    this.valuesKeys = Object.keys(values);
    this.defaults = defaults || {};
    this.options = options;
  }

  validate(context: Context): $ObjMap<S, <V>(v: Node<V>) => V> {
    // eslint-disable-line no-undef
    let res = context.buildMapping((valueContext, key, keyContext) => {
      if (this.values[key] == undefined) {
        if (!this.options.allowExtra) {
          let suggestion = this._guessSuggestion(key);
          if (suggestion) {
            throw keyContext.error(
              `Unexpected key: "${key}", did you mean "${suggestion}"?`,
            );
          } else {
            throw keyContext.error(`Unexpected key: "${key}"`);
          }
        } else {
          return (valueContext.unwrap(value => value): any);
        }
      }
      let value = this.values[key].validate(valueContext);
      return value;
    });
    let value = res.value;
    for (let key in this.values) {
      if (this.values.hasOwnProperty(key)) {
        if (value[key] === undefined) {
          if (this.defaults[key] === undefined) {
            let message = `While validating missing value for key "${key}"`;
            message = context.buildMessage(message, []);
            let nullContext = new NullContext(message, context);
            let {value: missingValue} = this.values[key].validate(nullContext);
            if (missingValue !== undefined) {
              value[key] = (missingValue: any);
            }
          } else {
            value[key] = this.defaults[key];
          }
        }
      }
    }
    return {...res, value};
  }

  _compareSuggestions(a: {distance: number}, b: {distance: number}): number {
    return a.distance - b.distance;
  }

  _guessSuggestion(key: string): ?string {
    let suggestions = this.valuesKeys.map(suggestion => ({
      distance: levenshtein(suggestion, key),
      suggestion,
    }));
    let suggestion = suggestions.sort(this._compareSuggestions)[0];
    if (suggestion.distance === key.length) {
      return null;
    } else {
      return suggestion.suggestion;
    }
  }
}

export function object<S: {[name: string]: Node<*>}>(
  values: S,
  defaults: ?Object,
): Node<$ObjMap<S, <V>(v: Node<V>) => V>> {
  // eslint-disable-line no-undef
  return new ObjectNode(values, defaults, {allowExtra: false});
}

export function partialObject<S: {[name: string]: Node<*>}>(
  values: S,
  defaults: ?Object,
): Node<$ObjMap<S, <V>(v: Node<V>) => V>> {
  // eslint-disable-line no-undef
  return new ObjectNode(values, defaults, {allowExtra: true});
}

export class SequenceNode<V> extends Node<Array<V>> {
  valueNode: Node<V>;

  constructor(valueNode: Node<V> = any) {
    super();
    this.valueNode = valueNode;
  }

  validate(context: Context): ValidateResult<Array<V>> {
    return context.buildSequence(context => this.valueNode.validate(context));
  }
}

export function arrayOf<V>(valueNode: Node<V> = any): SequenceNode<V> {
  return new SequenceNode(valueNode);
}

// Kept for backwards compatibility. Use `arrayOf` instead.
export function sequence<V>(valueNode: Node<V> = any): SequenceNode<V> {
  return new SequenceNode(valueNode);
}

export class MaybeNode<V> extends Node<V | null | void> {
  valueNode: Node<V>;

  constructor(valueNode: Node<V>) {
    super();
    this.valueNode = valueNode;
  }

  validate(context: Context): ValidateResult<V | null | void> {
    return context.unwrap(value => {
      if (value == null) {
        return value;
      }
      return this.valueNode.validate(context).value;
    });
  }
}

export function maybe<V>(valueNode: Node<V>): MaybeNode<V> {
  return new MaybeNode(valueNode);
}

export class EnumerationNode<V> extends Node<V> {
  values: Array<V>;

  constructor(values: Array<V>) {
    super();
    this.values = values;
  }

  validate(context: Context): ValidateResult<V> {
    return context.unwrap(value => {
      for (let i = 0; i < this.values.length; i++) {
        if (value === this.values[i]) {
          return (value: any);
        }
      }
      let expectation = this.values.map(v => JSON.stringify(v)).join(', ');
      let repr = JSON.stringify(value);
      throw context.error(`Expected value to be one of ${expectation} but got ${repr}`);
    });
  }
}

export function enumeration<A>(...values: Array<A>): EnumerationNode<A> {
  let node: EnumerationNode<A> = new EnumerationNode(values);
  return node;
}

export class OneOfNode<V> extends Node<V> {
  nodes: Array<Node<*>>;

  constructor(nodes: Array<Node<*>>) {
    super();
    this.nodes = nodes;
  }

  validate(context: Context): ValidateResult<*> {
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
    invariant(errors.length > 0, 'Impossible happened');
    throw optimizeOneOfError(errors);
  }
}

function oneOf_(...nodes) {
  if (nodes.length === 1) {
    return nodes[0];
  }
  let node = new OneOfNode(nodes);
  return node;
}

export let oneOf: (<A, B, C, D, E, F, G, H, I, J, K>(
  a: Node<A>,
  b: Node<B>,
  c: Node<C>,
  d: Node<D>,
  e: Node<E>,
  f: Node<F>,
  g: Node<G>,
  h: Node<H>,
  i: Node<I>,
  j: Node<J>,
  k: Node<K>,
) => Node<A | B | C | D | E | F | G | H | I | J | K>) &
  (<A, B, C, D, E, F, G, H, I, J>(
    a: Node<A>,
    b: Node<B>,
    c: Node<C>,
    d: Node<D>,
    e: Node<E>,
    f: Node<F>,
    g: Node<G>,
    h: Node<H>,
    i: Node<I>,
    j: Node<J>,
  ) => Node<A | B | C | D | E | F | G | H | I | J>) &
  (<A, B, C, D, E, F, G, H, I>(
    a: Node<A>,
    b: Node<B>,
    c: Node<C>,
    d: Node<D>,
    e: Node<E>,
    f: Node<F>,
    g: Node<G>,
    h: Node<H>,
    i: Node<I>,
  ) => Node<A | B | C | D | E | F | G | H | I>) &
  (<A, B, C, D, E, F, G, H>(
    a: Node<A>,
    b: Node<B>,
    c: Node<C>,
    d: Node<D>,
    e: Node<E>,
    f: Node<F>,
    g: Node<G>,
    h: Node<H>,
  ) => Node<A | B | C | D | E | F | G | H>) &
  (<A, B, C, D, E, F, G>(
    a: Node<A>,
    b: Node<B>,
    c: Node<C>,
    d: Node<D>,
    e: Node<E>,
    f: Node<F>,
    g: Node<G>,
  ) => Node<A | B | C | D | E | F | G>) &
  (<A, B, C, D, E, F>(
    a: Node<A>,
    b: Node<B>,
    c: Node<C>,
    d: Node<D>,
    e: Node<E>,
    f: Node<F>,
  ) => Node<A | B | C | D | E | F>) &
  (<A, B, C, D, E>(
    a: Node<A>,
    b: Node<B>,
    c: Node<C>,
    d: Node<D>,
    e: Node<E>,
  ) => Node<A | B | C | D | E>) &
  (<A, B, C, D>(a: Node<A>, b: Node<B>, c: Node<C>, d: Node<D>) => Node<A | B | C | D>) &
  (<A, B, C>(a: Node<A>, b: Node<B>, c: Node<C>) => Node<A | B | C>) &
  (<A, B>(a: Node<A>, b: Node<B>) => Node<A | B>) &
  (<A>(a: Node<A>) => Node<A>) = (oneOf_: any);

function optimizeOneOfError(errors) {
  let sections = errors.map(error => error.messages);

  sections = sections.map(messages => {
    if (messages[0] instanceof AlternativeMessage) {
      return explode(messages[0].alternatives, messages.slice(1));
    } else {
      return [messages];
    }
  });
  sections = flatten(sections);

  let maxWeight = Math.max.apply(null, sections.map(message => weightMessage(message)));

  sections = sections.filter(message => {
    return weightMessage(message) === maxWeight;
  });

  if (sections.length === 1) {
    return validationError(sections[0][0], sections[0].slice(1));
  }

  sections = sections.map(messages => messages.slice(0).reverse());

  // Collect same lines into a separate section
  let same = [];
  let i = 0;
  while (!sections.every(lines => lines[i] === undefined)) {
    if (sections.every(lines => lines[i] === sections[0][i])) {
      same.unshift(sections[0][i]);
    }
    i++;
  }

  sections = sections.map(lines => message(null, lines.slice(same.length).reverse()));

  // Collect alternatives
  let alternatives = [];
  sections.forEach(lines => {
    if (!alternatives.find(msg => sameMessage(msg, lines))) {
      alternatives.push(message(null, lines));
    }
  });

  return validationError(new AlternativeMessage(alternatives), same);
}

function sameMessage(a, b) {
  if (a === b) {
    return true;
  } else if (a instanceof Message) {
    return (
      b instanceof Message &&
      sameMessage(a.message, b.message) &&
      a.children.length === b.children.length &&
      a.children.every((child, idx) => sameMessage(child, b.children[idx]))
    );
  }
}

function weightMessage(msg) {
  if (msg instanceof Message) {
    return msg.children.length;
  } else if (Array.isArray(msg)) {
    return msg.length;
  } else {
    return 1;
  }
}

export class StringNode extends Node<string> {
  validate(context: Context): ValidateResult<string> {
    return context.unwrap(value => {
      if (typeof value !== 'string') {
        throw context.error(`Expected value of type string but got ${typeOf(value)}`);
      }
      return value;
    });
  }
}

export let string = new StringNode();

export class NumberNode extends Node<number> {
  validate(context: Context): ValidateResult<number> {
    return context.unwrap(value => {
      if (typeof value !== 'number') {
        throw context.error(`Expected value of type number but got ${typeOf(value)}`);
      }
      return value;
    });
  }
}

export let number = new NumberNode();

export class BooleanNode extends Node<boolean> {
  validate(context: Context): ValidateResult<boolean> {
    return context.unwrap(value => {
      if (typeof value !== 'boolean') {
        throw context.error(`Expected value of type boolean but got ${typeOf(value)}`);
      }
      return value;
    });
  }
}

export let boolean = new BooleanNode();

export class RecursiveNode<V> extends Node<V> {
  node: Node<V>;

  constructor(thunk: (node: Node<V>) => Node<V>) {
    super();
    this.node = thunk(this);
  }

  validate(context: Context): ValidateResult<V> {
    return this.node.validate(context);
  }
}

export function recur<V>(thunk: (node: Node<V>) => Node<V>): Node<V> {
  return new RecursiveNode(thunk);
}

type _ExtractType<V, _: Node<V>> = V;
export type ExtractType<N: Node<*>> = _ExtractType<*, N>;

function explode(variations, rest) {
  let result = [];
  for (let i = 0; i < variations.length; i++) {
    result.push([variations[i]].concat(rest));
  }
  return result;
}
