/**
 * @flow
 */

import * as s from './src/schema';
import * as o from './src/object';

function test_object() {
  const schema = s.object({
    name: s.string,
    age: s.number,
  });

  const data = o.validate(schema, {name: 'John Doe', age: 30});
  data.name;
  data.age;

  // $ExpectError
  date.namex;
}
