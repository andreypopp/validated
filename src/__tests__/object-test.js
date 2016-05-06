/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 */

import assert from 'assert';
import {
  ValidationError,
  mapping, object, partialObject, sequence, maybe, oneOf, enumeration,
  string, number, boolean, any
} from '../schema';
import {
  validate
} from '../object';

function assertSuccess(schema, value, expectedValue) {
  assert.deepStrictEqual(validate(schema, value), expectedValue);
}

function assertFailure(schema, value, errorSpec = {}) {
  try {
    validate(schema, value);
  } catch (error) {
    if (error instanceof ValidationError) {
      if (errorSpec.message) {
        assert.equal(error.message, errorSpec.message);
      }
      if (errorSpec.format) {
        assert.equal(error.toString(), errorSpec.format);
      }
      return;
    }
    throw error;
  }
  assert(false, 'Missing exception');
}

function itValidates(valueName, schema, value, expectedValue) {
  let description = `validates ${valueName}`;
  it(description, () => assertSuccess(schema, value, expectedValue));
}

function itDoesNotValidate(valueName, schema, value, message) {
  let description = `does not validate ${valueName}`;
  it(description, () => assertFailure(schema, value, message));
}

describe('validated/object', function() {

  describe('string', function() {
    let schema = string;
    itValidates('"ok"', schema, 'ok', 'ok');
    itDoesNotValidate('1', schema, 1, {
      format: [
        'Expected value of type string but got number',
      ].join('\n')
    });
    itDoesNotValidate('true', schema, true, {
      format: [
        'Expected value of type string but got boolean',
      ].join('\n')
    });
  });

  describe('number', function() {
    let schema = number;
    itValidates('1', schema, 1, 1);
    itDoesNotValidate('"ok"', schema, 'ok', {
      format: [
        'Expected value of type number but got string',
      ].join('\n')
    });
    itDoesNotValidate('true', schema, true, {
      format: [
        'Expected value of type number but got boolean',
      ].join('\n')
    });
  });

  describe('boolean', function() {
    let schema = boolean;
    itValidates('true', schema, true, true);
    itDoesNotValidate('1', schema, 1, {
      format: [
        'Expected value of type boolean but got number',
      ].join('\n')
    });
    itDoesNotValidate('"ok"', schema, 'ok', {
      format: [
        'Expected value of type boolean but got string',
      ].join('\n')
    });
  });

  describe('mapping', function() {
    describe('simple schema', function() {
      let schema = mapping(any);
      itValidates('{}', schema, {}, {});
      itValidates('{a: 1}', schema, {a: 1}, {a: 1});
      itValidates('{a: 1, b: 2}', schema, {a: 1, b: 2}, {a: 1, b: 2});
      itDoesNotValidate('Array', schema, [], {
        format: 'Expected a mapping but got array'
      });
      itDoesNotValidate('null', schema, null, {
        format: 'Expected a mapping but got null'
      });
      itDoesNotValidate('undefined', schema, undefined, {
        format: 'Expected a mapping but got undefined'
      });
      itDoesNotValidate('Number', schema, 1, {
        format: 'Expected a mapping but got number'
      });
      itDoesNotValidate('Boolean', schema, true, {
        format: 'Expected a mapping but got boolean'
      });
      itDoesNotValidate('String', schema, 'not ok', {
        format: 'Expected a mapping but got string'
      });
    });
    describe('restricted schema', function() {
      let schema = mapping(string);
      itValidates('{}', schema, {}, {});
      itValidates('{a: "ok"}', schema, {a: 'ok'}, {a: 'ok'});
      itDoesNotValidate('{a: 42}', schema, {a: 42}, {
        format: [
          'Expected value of type string but got number',
          'While validating value at key "a"',
        ].join('\n')
      });
    });
  });

  describe('object', function() {
    describe('with fields', function() {
      let schema = object({a: any, b: any});
      itValidates('{a: 1, b: 2}', schema, {a: 1, b: 2}, {a: 1, b: 2});
      itDoesNotValidate('{a: 1}', schema, {a: 1}, {
        format: [
          'Expected a value but got undefined',
          'While validating missing value for key "b"',
        ].join('\n')
      });
      itDoesNotValidate('{b: 1}', schema, {b: 1}, {
        format: [
          'Expected a value but got undefined',
          'While validating missing value for key "a"',
        ].join('\n')
      });
      itDoesNotValidate('{}', schema, {}, {
        format: [
          'Expected a value but got undefined',
          'While validating missing value for key "a"',
        ].join('\n')
      });
      itDoesNotValidate('{c: 3}', schema, {c: 3}, {
        format: [
          'Unexpected key: "c"',
          'While validating key "c"',
        ].join('\n')
      });
      itDoesNotValidate('{a: 1, b: 2, c: 3}', schema, {a: 1, b: 2, c: 3}, {
        format: [
          'Unexpected key: "c"',
          'While validating key "c"',
        ].join('\n')
      });
      itDoesNotValidate('Array', schema, [], {
        format: 'Expected a mapping but got array'
      });
      itDoesNotValidate('null', schema, null, {
        format: 'Expected a mapping but got null'
      });
      itDoesNotValidate('undefined', schema, undefined, {
        format: 'Expected a mapping but got undefined'
      });
      itDoesNotValidate('Number', schema, 1, {
        format: 'Expected a mapping but got number'
      });
      itDoesNotValidate('Boolean', schema, true, {
        format: 'Expected a mapping but got boolean'
      });
      itDoesNotValidate('String', schema, 'not ok', {
        format: 'Expected a mapping but got string'
      });
    });

    describe('with fields with specific validator', function() {
      let schema = object({a: string, b: string});
      itValidates('{a: "a", b: "b"}', schema, {a: 'a', b: 'b'}, {a: 'a', b: 'b'});
      itDoesNotValidate('{a: 1, b: 2}', schema, {a: 1}, {
        format: [
          'Expected value of type string but got number',
          'While validating value at key "a"',
        ].join('\n')
      });
    });

    describe('with fields defaults', function() {
      let schema = object({a: string, b: string}, {a: 'ok'});
      itValidates('{a: "a", b: "b"}', schema, {a: 'a', b: 'b'}, {a: 'a', b: 'b'});
      itValidates('{b: "b"}', schema, {b: 'b'}, {a: 'ok', b: 'b'});
    });

  });

  describe('partialObject', function() {
    describe('with fields', function() {
      let schema = partialObject({a: any, b: any});
      itValidates('{a: 1, b: 2', schema, {a: 1, b: 2}, {a: 1, b: 2});
      itValidates('{a: 1, b: 2, c: 3}', schema, {a: 1, b: 2, c: 3}, {a: 1, b: 2, c: 3});
    });
  });

  describe('oneOf', function() {

    describe('with scalars', function() {
      let schema = oneOf(string, number);
      itValidates('Number', schema, 1, 1);
      itValidates('String', schema, 'ok', 'ok');
      itDoesNotValidate('Boolean', schema, true, {
        format: [
          'Either:',
          '',
          '  Expected value of type string but got boolean',
          '',
          '  Expected value of type number but got boolean',
          '',
        ].join('\n')
      });
      itDoesNotValidate('Object', schema, {}, {
        format: [
          'Either:',
          '',
          '  Expected value of type string but got object',
          '',
          '  Expected value of type number but got object',
          '',
        ].join('\n')
      });
    });

    describe('with containers', function() {
      let schema = oneOf(object({a: number}), object({a: string}));
      itValidates('Object {a: number}', schema, {a: 1}, {a: 1});
      itValidates('Object {a: string}', schema, {a: 'ok'}, {a: 'ok'});
      itDoesNotValidate('Object {a: boolean}', schema, {a: true}, {
        format: [
          'Either:',
          '',
          '  Expected value of type number but got boolean',
          '',
          '  Expected value of type string but got boolean',
          '',
          'While validating value at key "a"',
        ].join('\n')
      });
    });

  });

  describe('enumeration', function() {
    let schema = enumeration(42, 'ok');
    itValidates('42', schema, 42, 42);
    itValidates('"ok"', schema, 'ok', 'ok');
    itDoesNotValidate('1', schema, 1, {
      format: [
        'Expected value to be one of 42, "ok" but got 1',
      ].join('\n')
    });
  });

  describe('maybe', function() {
    let schema = maybe(string);
    itValidates('null', schema, null, null);
    itValidates('undefined', schema, undefined, undefined);
    itValidates('String', schema, 'not ok', 'not ok');
    itDoesNotValidate('Number', schema, 1, {
      format: [
        'Expected value of type string but got number',
      ].join('\n')
    });
  });

});
