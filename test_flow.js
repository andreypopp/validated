/**
 * @flow
 */

import * as o from './src/object';
import * as s from './src/schema';

function test_object() {
  const schema = s.object({
    name: s.string,
    age: s.number,
  });

  const data = o.validate(schema, {name: 'John Doe', age: 30});
  data.name;
  data.age;

  // $ExpectError
  data.namex;
}

function test_enum() {
  const schema: s.EnumerationNode<'a' | 'v'> = s.enumeration('a', 'v');
  const data = o.validate(schema, 'a');
  (data: 'a' | 'v');
  (data: string);
  // $ExpectError
  (data: number);
}
