/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import {
  recur,
  oneOf,
  enumeration,
  object,
  partialObject,
  sequence,
  mapping,
  string,
  number,
  boolean,
  maybe,
  any,
  constant,
} from './schema';

export let schema = recur(schema =>
  oneOf(
    constant('string').andThen(_ => string),
    constant('number').andThen(_ => number),
    constant('boolean').andThen(_ => boolean),
    constant('any').andThen(_ => any),
    object({
      enumeration: sequence(any),
    }).andThen(obj => enumeration(obj.enumeration)),
    object({
      constant: any,
    }).andThen(obj => constant(obj.constant)),
    object({
      maybe: schema,
    }).andThen(obj => maybe(obj.maybe)),
    object({
      mapping: schema,
    }).andThen(obj => mapping(obj.mapping)),
    object({
      sequence: schema,
    }).andThen(obj => sequence(obj.sequence)),
    object({
      object: mapping(schema),
      defaults: maybe(any),
    }).andThen(obj => object(obj.object, obj.defaults)),
    object({
      partialObject: mapping(schema),
      defaults: maybe(any),
    }).andThen(obj => partialObject(obj.partialObject, obj.defaults)),
  ),
);
