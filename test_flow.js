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

function test_extract_type() {
  // define type
  const PersonFields = s.partialObject({name: s.string, age: s.number, email: s.string});

  // this is how to extract type from a validator
  type Person = s.ExtractType<typeof PersonFields>;

  // assert that types are unified
  const user: Person = o.validate(PersonFields, '');
  const name: string = user.name;
  // $ExpectError
  const invalid: number = user.name;
}
