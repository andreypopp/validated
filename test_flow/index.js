/**
 * @flow
 */

import {object, arrayOf, string, number, ref, recur} from '../src/schema';
import {validate} from '../src/object';

export function simpleTest() {
  let person = object({
    name: string,
    age: number,
  });

  type Person = {
    name: string,
    age: number,
  };

  let x = validate(person, {});
  (x: Person);
  (x.age: number);
  (x.name: string);

  // $ExpectError: oops
  x.oops;

  type WrongPerson = {
    firstname: string,
    age: number,
  };

  let y = validate(person, {});

  // $ExpectError: oops
  (y: WrongPerson);
}

export function refTest() {

  let person = recur(person =>
    object({
      name: string,
      age: number,
      friends: arrayOf(person),
    })
  );

  type Person = {
    name: string,
    age: number,
    friends: Person[],
  };

  let x = validate(person, {});

  (x: Person);
  (x.name: string);
  (x.age: number);
  (x.friends: Person[]);

  // $ExpectError: oops
  x.oops;
}
