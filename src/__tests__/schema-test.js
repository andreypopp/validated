/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 */

import assert from 'assert';
import {validate as validateJSON5} from '../json5';
import {validate as validateObject} from '../object';
import {Node, sequence, number, object} from '../schema';


describe('validated/schema', function() {

  describe('refine', function() {
    class Point {

      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    }

    let point = sequence(number).andThen((value, error) => {
      if (value.length !== 2) {
        throw error('Expected an array of length 2 but got: ' + value.length);
      }
      let [x, y] = value;
      return new Point(x, y);
    });

    it('validates from object', function() {
      let schema = object({point});
      let p = validateObject(schema, {point: [1, 2]});
      assert(p.point);
      assert(p.point instanceof Point);
      assert(p.point.x === 1);
      assert(p.point.y === 2);
      try {
        validateObject(schema, {point: [1, 2, 3]});
      } catch (err) {
        assert.equal(err.message, [
          'Expected an array of length 2 but got: 3',
          'While validating value at key "point"',
        ].join('\n'));
        return;
      }
      assert(false, 'Missing exception');
    });

    it('validates from json', function() {
      let schema = object({point});
      let p = validateJSON5(schema, '{point: [1, 2]}');
      assert(p.point);
      assert(p.point instanceof Point);
      assert(p.point.x === 1);
      assert(p.point.y === 2);
      try {
        validateJSON5(schema, '{point: [1, 2, 3]}');
      } catch (err) {
        assert.equal(err.message, [
          'Expected an array of length 2 but got: 3',
          'While validating value at key "point" (line 1 column 9)',
        ].join('\n'));
        return;
      }
      assert(false, 'Missing exception');
    });

  });

  describe('defining custom schema types', function() {

    class Point {

      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    }

    class PointNode extends Node {

      validate(context) {
        // prevalidate value with primitive validators
        let prevalidator = sequence(number);
        let {value, context: nextContext} = prevalidator.validate(context);

        // perform additional validations
        if (value.length !== 2) {

          // just report an error, context information such as line/column
          // numbers will be injected automatically
          throw context.error('Expected an array of length 2 but got: ' + value.length);
        }

        // construct a Point object, do whatever you want here
        let [x, y] = value;
        let point = new Point(x, y);

        // return constructed value and the next context
        return {value: point, context: nextContext};
      }
    }

    it('validates from object', function() {
      let schema = object({point: new PointNode()});
      let p = validateObject(schema, {point: [1, 2]});
      assert(p.point);
      assert(p.point instanceof Point);
      assert(p.point.x === 1);
      assert(p.point.y === 2);
      try {
        validateObject(schema, {point: [1, 2, 3]});
      } catch (err) {
        assert.equal(err.message, [
          'Expected an array of length 2 but got: 3',
          'While validating value at key "point"',
        ].join('\n'));
        return;
      }
      assert(false, 'Missing exception');
    });

    it('validates from json', function() {
      let schema = object({point: new PointNode()});
      let p = validateJSON5(schema, '{point: [1, 2]}');
      assert(p.point);
      assert(p.point instanceof Point);
      assert(p.point.x === 1);
      assert(p.point.y === 2);
      try {
        validateJSON5(schema, '{point: [1, 2, 3]}');
      } catch (err) {
        assert.equal(err.message, [
          'Expected an array of length 2 but got: 3',
          'While validating value at key "point" (line 1 column 9)',
        ].join('\n'));
        return;
      }
      assert(false, 'Missing exception');
    });

  });
});
