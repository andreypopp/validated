/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import {
  any,
  boolean,
  constant,
  enumeration,
  mapping,
  maybe,
  number,
  object,
  oneOf,
  partialObject,
  recur,
  sequence,
  string,
} from './schema';

import type {Node} from './schema';

const asAnyNode = (node: Node<any>) => node;

const stringSchema: Node<Node<any>> = constant('string').andThen(_ => string);
const numberSchema: Node<Node<any>> = constant('number').andThen(_ => number);
const booleanSchema: Node<Node<any>> = constant('boolean').andThen(_ => boolean);
const anySchema: Node<Node<any>> = constant('any').andThen(_ => asAnyNode(any));
const enumerationSchema: Node<Node<any>> = object({enumeration: sequence(any)}).andThen(
  obj => enumeration(obj.enumeration),
);
const constantSchema: Node<Node<any>> = object({constant: any}).andThen(obj =>
  constant(obj.constant),
);
const maybeSchema: (Node<Node<any>>) => Node<Node<any>> = schema =>
  object({maybe: schema}).andThen(obj => maybe(obj.maybe));
const mappingSchema: (Node<Node<any>>) => Node<Node<any>> = schema =>
  object({mapping: schema}).andThen(obj => mapping(obj.mapping));
const sequenceSchema: (Node<Node<any>>) => Node<Node<any>> = schema =>
  object({sequence: schema}).andThen(obj => sequence(obj.sequence));
const objectSchema: (Node<Node<any>>) => Node<Node<any>> = schema =>
  object({object: mapping(schema), defaults: maybe(any)}).andThen(obj =>
    object(obj.object, obj.defaults),
  );
const partialObjectSchema: (Node<Node<any>>) => Node<Node<any>> = schema =>
  object({partialObject: mapping(schema), defaults: maybe(any)}).andThen(obj =>
    partialObject(obj.partialObject, obj.defaults),
  );

const schemaSchema: Node<Node<any>> = recur(schema =>
  oneOf(
    stringSchema,
    numberSchema,
    booleanSchema,
    anySchema,
    enumerationSchema,
    constantSchema,
    maybeSchema(schema),
    mappingSchema(schema),
    sequenceSchema(schema),
    objectSchema(schema),
    partialObjectSchema(schema),
  ),
);

export const schema = schemaSchema;
