/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 */

import assert from 'assert';
import {
  ValidationError,
  mapping, object, partialObject, sequence, maybe, oneOf, enumeration,
  string, number, boolean, any
} from '../schema';
import {validate} from '../json5';

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

function itDoesNotValidate(valueName, schema, value, errorSpec) {
  let description = `does not validate ${valueName}`;
  it(description, () => assertFailure(schema, value, errorSpec), ValidationError);
}

describe('validated/json5', function() {

  describe('string', function() {
    let schema = string;
    itValidates('string', schema, '"ok"', 'ok');
    itDoesNotValidate('number', schema, '1', {
      format: [
        'Expected value of type string but got number (line 1 column 1)'
      ].join('\n')
    });
    itDoesNotValidate('number', schema, '  1', {
      format: [
        'Expected value of type string but got number (line 1 column 3)'
      ].join('\n')
    });
    itDoesNotValidate('number', schema, '  \n1', {
      format: [
        'Expected value of type string but got number (line 2 column 0)'
      ].join('\n')
    });
  });

  describe('number', function() {
    let schema = number;
    itValidates('number', schema, '1', 1);
    itDoesNotValidate('string', schema, '"ok"', {
      format: [
        'Expected value of type number but got string (line 1 column 1)'
      ].join('\n')
    });
  });

  describe('boolean', function() {
    let schema = boolean;
    itValidates('boolean', schema, 'true', true);
    itDoesNotValidate('string', schema, '"ok"', {
      format: [
        'Expected value of type boolean but got string (line 1 column 1)'
      ].join('\n')
    });
  });

  describe('mapping', function() {

    describe('simple schema', function() {
      let schema = mapping(any);
      itValidates('{}', schema, '{}', {});
      itValidates('{a: 42}', schema, '{a: 42}', {a: 42});
      itDoesNotValidate('[]', schema, '[]', {
        format: [
          'Expected a mapping but got array (line 1 column 1)'
        ].join('\n')
      });
    });

    describe('restricted schema', function() {
      let schema = mapping(string);
      itValidates('{}', schema, '{}', {});
      itValidates('{a: "ok"}', schema, '{a: "42"}', {a: '42'});
      itDoesNotValidate('{a: 42}', schema, '{a: 42}', {
        format: [
          'Expected value of type string but got number',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });
  });

  describe('object', function() {
    describe('with fields', function() {
      let schema = object({a: any, b: any});
      itValidates('{a: 1, b: 2}', schema, '{a: 1, b: 2}', {a: 1, b: 2});
      itDoesNotValidate('{a: 1}', schema, '{a: 1}', {
        format: [
          'Expected a value but got undefined',
          'While validating missing value for key "b" (line 1 column 1)',
        ].join('\n')
      });
      itDoesNotValidate('{b: 1}', schema, '{b: 1}', {
        format: [
          'Expected a value but got undefined',
          'While validating missing value for key "a" (line 1 column 1)',
        ].join('\n')
      });
      itDoesNotValidate('{}', schema, '{}', {
        format: [
          'Expected a value but got undefined',
          'While validating missing value for key "a" (line 1 column 1)',
        ].join('\n')
      });
      itDoesNotValidate('{c: 3}', schema, '{c: 3}', {
        format: [
          'Unexpected key: "c"',
          'While validating key "c" (line 1 column 2)',
        ].join('\n')
      });
      itDoesNotValidate('{a: 1, b: 2, c: 3}', schema, '{a: 1, b: 2, c: 3}', {
        format: [
          'Unexpected key: "c"',
          'While validating key "c" (line 1 column 14)',
        ].join('\n')
      });
      itDoesNotValidate('Array', schema, '[1]', {
        format: [
          'Expected a mapping but got array (line 1 column 1)',
        ].join('\n')
      });
      itDoesNotValidate('Number', schema, '1', {
        format: [
          'Expected a mapping but got number (line 1 column 1)',
        ].join('\n')
      });
      itDoesNotValidate('Boolean', schema, 'true', {
        format: [
          'Expected a mapping but got boolean (line 1 column 1)',
        ].join('\n')
      });
      itDoesNotValidate('String', schema, "'not ok'", {
        format: [
          'Expected a mapping but got string (line 1 column 1)',
        ].join('\n')
      });
    });

    describe('suggestions for unexpected key errors', function() {
      let schema = object({entry: string, output: string});
      itDoesNotValidate('{entry: "ok", outpu: "notok"}', schema, '{entry: "ok", outpu: "notok"}', {
        format: [
          'Unexpected key: "outpu", did you mean "output"?',
          'While validating key "outpu" (line 1 column 15)',
        ].join('\n')
      });
      itDoesNotValidate('{etry: "ok", output: "notok"}', schema, '{etry: "ok", output: "notok"}', {
        format: [
          'Unexpected key: "etry", did you mean "entry"?',
          'While validating key "etry" (line 1 column 2)',
        ].join('\n')
      });
    });

    describe('with fields with specific validator', function() {
      let schema = object({a: string, b: string});
      itValidates('{a: "a", b: "b"}', schema, "{a: 'a', b: 'b'}", {a: 'a', b: 'b'});
      itDoesNotValidate('{a: 1, b: 2}', schema, '{a: 1}', {
        format: [
          'Expected value of type string but got number',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });

    describe('with fields defaults', function() {
      let schema = object({a: string, b: string}, {a: 'ok'});
      itValidates('{a: "a", b: "b"}', schema, "{a: 'a', b: 'b'}", {a: 'a', b: 'b'});
      itValidates('{b: "b"}', schema, "{b: 'b'}", {a: 'ok', b: 'b'});
    });

    describe('with fields optional fields', function() {
      let schema = object({a: maybe(string), b: string});
      itValidates('{a: "a", b: "b"}', schema, "{a: 'a', b: 'b'}", {a: 'a', b: 'b'});
      itValidates('{b: "b"}', schema, "{b: 'b'}", {b: 'b'});
      itDoesNotValidate('{a: 42, b: "b"}', schema, "{a: 42, b: 'b'}", {
        format: [
          'Expected value of type string but got number',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });

    describe('with fields optional fields and defaults', function() {
      let schema = object({a: maybe(string), b: string}, {a: 'ok'});
      itValidates('{a: "a", b: "b"}', schema, "{a: 'a', b: 'b'}", {a: 'a', b: 'b'});
      itValidates('{b: "b"}', schema, "{b: 'b'}", {a: 'ok', b: 'b'});
      itDoesNotValidate('{a: 42, b: "b"}', schema, "{a: 42, b: 'b'}", {
        format: [
          'Expected value of type string but got number',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });

  });

  describe('partialObject', function() {
    describe('with fields', function() {
      let schema = partialObject({a: any, b: any});
      itValidates('{a: 1, b: 2', schema, '{a: 1, b: 2}', {a: 1, b: 2});
      itValidates('{a: 1, b: 2, c: 3}', schema, '{a: 1, b: 2, c: 3}', {a: 1, b: 2, c: 3});
    });
  });

  describe('sequence', function() {
    describe('simple schema', function() {
      let schema = sequence(any);
      itValidates('[]', schema, '[]', []);
      itValidates('[42]', schema, '[42]', [42]);
      itValidates('[42, 43]', schema, '[42, 43]', [42, 43]);
      itDoesNotValidate('Object', schema, '{}', {
        format: [
          'Expected an array but got object (line 1 column 1)',
        ].join('\n')
      });
      itDoesNotValidate('Number', schema, '1');
      itDoesNotValidate('Boolean', schema, 'true');
      itDoesNotValidate('String', schema, "'not ok'");
    });
    describe('restricted schema', function() {
      let schema = sequence(string);
      itValidates('[]', schema, '[]', []);
      itValidates('["ok"]', schema, "['ok']", ['ok']);
      itDoesNotValidate('[42]', schema, '[42]', {
        format: [
          'Expected value of type string but got number',
          'While validating value at index 0 (line 1 column 2)',
        ].join('\n')
      });
      itDoesNotValidate('["ok", 42]', schema, "['ok', 429]", {
        format: [
          'Expected value of type string but got number',
          'While validating value at index 1 (line 1 column 8)',
        ].join('\n')
      });
    });
  });

  describe('oneOf', function() {

    describe('with scalars', function() {
      let schema = oneOf(string, number);
      itValidates('Number', schema, '1', 1);
      itValidates('String', schema, "'ok'", 'ok');
      itDoesNotValidate('Boolean', schema, 'true', {
        format: [
          'Either:',
          '',
          '  Expected value of type string but got boolean (line 1 column 1)',
          '',
          '  Expected value of type number but got boolean (line 1 column 1)',
          '',
        ].join('\n')
      });
      itDoesNotValidate('Object', schema, '{}');
    });

    describe('with containers', function() {
      let schema = oneOf(object({a: number}), object({a: string}));
      itValidates('Object {a: number}', schema, '{a: 1}', {a: 1});
      itValidates('Object {a: string}', schema, "{a: 'ok'}", {a: 'ok'});
      itDoesNotValidate('Object {a: boolean}', schema, '{a: true}', {
        format: [
          'Either:',
          '',
          '  Expected value of type number but got boolean',
          '',
          '  Expected value of type string but got boolean',
          '',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });

    describe('with containers (complex)', function() {
      let schema = oneOf(object({a: number}), object({a: object({c: string})}));
      itDoesNotValidate('Object {a: boolean}', schema, '{a: true}', {
        format: [
          'Either:',
          '',
          '  Expected value of type number but got boolean',
          '',
          '  Expected a mapping but got boolean',
          '',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });

    describe('with containers (nested)', function() {
      let schema = oneOf(object({a: number}), object({a: oneOf(string, boolean)}));
      itDoesNotValidate('Object {a: boolean}', schema, '{a: []}', {
        format: [
          'Either:',
          '',
          '  Expected value of type number but got array',
          '',
          '  Expected value of type string but got array',
          '',
          '  Expected value of type boolean but got array',
          '',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });

    describe('with containers (nested complex assymmetrical)', function() {
      let schema = oneOf(object({a: number}), object({a: oneOf(object({c: number}), boolean)}));
      itDoesNotValidate('Object {a: boolean}', schema, '{a: {c: "not ok"}}', {
        format: [
          'Expected value of type number but got string',
          'While validating value at key "c" (line 1 column 9)',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });

    describe('with containers (nested complex symmetrical)', function() {
      let schema = oneOf(object({a: oneOf(object({c: boolean}), number)}), object({a: oneOf(object({c: number}), boolean)}));
      itDoesNotValidate('Object {a: boolean}', schema, '{a: "not ok"}', {
        format: [
          'Either:',
          '',
          '  Expected a mapping but got string',
          '',
          '  Expected value of type number but got string',
          '',
          '  Expected value of type boolean but got string',
          '',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
      itDoesNotValidate('{a: {c: "not ok"}}', schema, '{a: {c: "not ok"}}', {
        format: [
          'Either:',
          '',
          '  Expected value of type boolean but got string',
          '',
          '  Expected value of type number but got string',
          '',
          'While validating value at key "c" (line 1 column 9)',
          'While validating value at key "a" (line 1 column 5)',
        ].join('\n')
      });
    });

  });

  describe('enumeration', function() {
    let schema = enumeration(42, 'ok');
    itValidates('42', schema, '42', 42);
    itValidates('"ok"', schema, "'ok'", 'ok');
    itDoesNotValidate('1', schema, '1', {
      format: [
        'Expected value to be one of 42, "ok" but got 1 (line 1 column 1)',
      ].join('\n')
    });
  });

  describe('maybe', function() {
    let schema = object({a: maybe(string)});
    itValidates('{a: null}', schema, '{a: null}', {a: null});
    itValidates('{a: String}', schema, "{a: 'ok'}", {a: 'ok'});
// $FlowIssue: ...
    itDoesNotValidate('{a: Number}', schema, '{a: 42}', {
      format: [
        'Expected value of type string but got number',
        'While validating value at key "a" (line 1 column 5)',
      ].join('\n')
    });
  });

});

