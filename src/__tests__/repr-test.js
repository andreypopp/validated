/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 */

import assert from 'assert';
import {schema} from '../repr';
import {MaybeNode, AnyNode} from '../schema';
import {validate as validateObject} from '../object';
import {validate as validateJSON5} from '../json5';

describe('validated/repr', function() {
  it('has object repr', function() {
    let repr = {maybe: 'any'};
    let sch = validateObject(schema, repr);
    assert(sch instanceof MaybeNode);
    assert(sch.valueNode instanceof AnyNode);
  });

  it('has json5 repr', function() {
    let repr = "{maybe: 'any'}";
    let sch = validateJSON5(schema, repr);
    assert(sch instanceof MaybeNode);
    assert(sch.valueNode instanceof AnyNode);
  });
});
