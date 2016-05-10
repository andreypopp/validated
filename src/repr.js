/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import {
  ref, oneOf, enumeration, object, partialObject, sequence, mapping,
  string, number, boolean, maybe, any, constant
} from './schema';

let schemaSchemaSelf = ref();
let schemaSchema = oneOf(

  constant('string').andThen(_ => string),
  constant('number').andThen(_ => number),
  constant('boolean').andThen(_ => boolean),
  constant('any').andThen(_ => any),

  object({
    enumeration: sequence(any)
  }).andThen(obj => enumeration(obj.enumeration)),

  object({
    constant: any
  }).andThen(obj => constant(obj.constant)),

  object({
    maybe: schemaSchemaSelf
  }).andThen(obj => maybe(obj.maybe)),

  object({
    mapping: schemaSchemaSelf
  }).andThen(obj => mapping(obj.mapping)),

  object({
    sequence: schemaSchemaSelf
  }).andThen(obj => sequence(obj.sequence)),

  object({
    object: mapping(schemaSchemaSelf),
    defaults: maybe(any)
  }).andThen(obj => object(obj.object, obj.defaults)),

  object({
    partialObject: mapping(schemaSchemaSelf),
    defaults: maybe(any)
  }).andThen(obj => partialObject(obj.partialObject, obj.defaults)),

);

export let schema = schemaSchema;
schemaSchemaSelf.set(schemaSchema);
