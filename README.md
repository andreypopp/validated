# validated

[![Join the chat at https://gitter.im/andreypopp/sitegen](https://img.shields.io/badge/gitter-join%20chat-green.svg)](https://gitter.im/andreypopp/sitegen)
[![Travis build status](https://img.shields.io/travis/andreypopp/validated/master.svg)](https://travis-ci.org/andreypopp/validated)
[![Type System](https://img.shields.io/badge/typesystem-flowtype-green.svg)](http://flowtype.org/)

Validate your configurations with precise error messages:

* Define schema with validators which are agnostic to the actual representation
  of data, be it a JSON string, object in memory or any other format.

* Use schema with runners specific for formats (object and JSON5 runners are
  included). Get error messages with precise info (line and column numbers for
  example).

* Get the result of a validation as an object: either a plain JSON or some
  domain specific classes if schema is defined in that way.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Schema](#schema)
  - [List of schema primitives](#list-of-schema-primitives)
      - [`any`](#any)
      - [`string`, `number`, `boolean`](#string-number-boolean)
      - [`enumeration`](#enumeration)
      - [`mapping`](#mapping)
      - [`sequence`](#sequence)
      - [`object`](#object)
      - [`partialObject`](#partialobject)
      - [`maybe`](#maybe)
      - [`oneOf`](#oneof)
      - [`ref`](#ref)
  - [Refining validations](#refining-validations)
  - [Defining new schema types](#defining-new-schema-types)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

```
% npm install validated
```

## Usage

### Schema

Schema is defined with validators which are agnostic to the actual
representation of data, be it a JSON string or an object in memory:

```js+test
import {
  mapping, sequence, object, partialObject, oneOf, maybe, enumeration, ref,
  any, string, number, boolean
} from 'validated/schema'
```

There's schema validator for JSON objects in memory:

```js+test
import {
  validate as validateObject
} from 'validated/object'
```

And schema validator for strings with JSON/JSON5 encoded data:

```js+test
import {
  validate as validateJSON5
} from 'validated/json5'
```

Let's define some schema first:
```js+test
let person = object({
  name: string,
  age: number,
})

let pet = object({
  nickName: string,
  age: number,
})

let collection = sequence(oneOf(person, pet))

validateJSON5(collection, '[{name: "John", age: 26}, {nickName: "Tima", age: 3}]')
// => [ { name: 'John', age: 26 }, { nickName: 'Tima', age: 3 } ]

validateObject(collection, [{name: "John", age: 26}, {nickName: "Tima", age: 3}])
// => [ { name: 'John', age: 26 }, { nickName: 'Tima', age: 3 } ]
```

### List of schema primitives

##### `any`

Validates any value but not `undefined` or `null`:

```js+test
validateObject(any, 'ok')
// => 'ok'

validateObject(any, 42)
// => 42

validateObject(any, null)
// ValidationError: Expected a value but got null

validateObject(any, undefined)
// ValidationError: Expected a value but got undefined
```

If you want to validated any value and even an absence of one then wrap it in
`maybe`:

```js+test
validateObject(maybe(any), null)
// => null

validateObject(maybe(any), undefined)
// => undefined
```

##### `string`, `number`, `boolean`

Validate strings, numbers and booleans correspondingly.

```js+test
validateObject(string, 'ok')
// => 'ok'

validateObject(number, 42)
// => 42

validateObject(boolean, true)
// => true
```

##### `enumeration`

Validate enumerations:

```js+test
validateObject(enumeration('yes', 'no'), 'yes')
// => 'yes'

validateObject(enumeration('yes', 'no'), 'no')
// => 'no'

validateObject(enumeration('yes', 'no'), 'oops')
// ValidationError: Expected value to be one of "yes", "no" but got "oops"
```

##### `mapping`

Validate mappings from string keys to values.

Untyped values (value validator defaults to `any`):

```js+test
validateObject(mapping(), {})
// => {}

validateObject(mapping(), {a: 1, b: 'ok'})
// => { a: 1, b: 'ok' }

validateObject(mapping(), 'oops')
// ValidationError: Expected a mapping but got string
```

Typed value:

```js+test
validateObject(mapping(number), {a: 1})
// => { a: 1 }

validateObject(mapping(number), {a: 1, b: 'ok'})
// ValidationError: Expected value of type number but got string
// While validating value at key "b"
```

##### `sequence`

Validate sequences.

Untyped values (value validator defaults to `any`):

```js+test
validateObject(sequence(), [])
// => []

validateObject(sequence(), [1, 2, 'ok'])
// => [ 1, 2, 'ok' ]

validateObject(sequence(), 'oops')
// ValidationError: Expected an array but got string
```

Typed value:

```js+test
validateObject(sequence(number), [1, 2])
// => [ 1, 2 ]

validateObject(sequence(number), [1, 2, 'ok'])
// ValidationError: Expected value of type number but got string
// While validating value at index 2
```

##### `object`

Validate objects, objects must specify validator for each of its keys:

```js+test
let person = object({
  name: string,
  age: number,
})

validateObject(person, {name: 'john', age: 27})
// => { name: 'john', age: 27 }

validateObject(person, {name: 'john'})
// ValidationError: Expected value of type number but got undefined
// While validating missing value for key "age"

validateObject(person, {name: 'john', age: 'notok'})
// ValidationError: Expected value of type number but got string
// While validating value at key "age"

validateObject(person, {name: 'john', age: 42, extra: 'oops'})
// ValidationError: Unexpected key: "extra"
// While validating key "extra"

validateObject(person, {nam: 'john', age: 42})
// ValidationError: Unexpected key: "nam", did you mean "name"?
// While validating key "nam"
```

If some key is optional, wrap its validator in `maybe`:

```js+test
let person = object({
  name: string,
  age: number,
  nickName: maybe(string),
})

validateObject(person, {name: 'john', age: 27})
// => { name: 'john', age: 27 }

validateObject(person, {name: 'john', age: 27, nickName: 'J'})
// => { name: 'john', age: 27, nickName: 'J' }
```

You can also specify default values for keys:

```js+test
let person = object({
  name: string,
  age: number,
  nickName: string,
}, {
  nickName: 'John Doe'
})

validateObject(person, {name: 'john', age: 27})
// => { name: 'john', age: 27, nickName: 'John Doe' }

validateObject(person, {name: 'john', age: 27, nickName: 'J'})
// => { name: 'john', age: 27, nickName: 'J' }
```

##### `partialObject`

Validate a subset of the keys from the object, passing all extra keys through:

```js+test
let person = partialObject({
  name: string,
  age: number,
})

validateObject(person, {name: 'john', age: 27})
// => { name: 'john', age: 27 }

validateObject(person, {name: 'john', age: 42, extra: 'ok'})
// => { name: 'john', age: 42, extra: 'ok' }
```

##### `maybe`

Validates `null` and `undefined` but passes through any other value to the
underlying validator:

```js+test
validateObject(maybe(string), null)
// => null

validateObject(maybe(string), undefined)
// => undefined

validateObject(maybe(string), 'ok')
// => 'ok'

validateObject(maybe(string), 42)
// ValidationError: Expected value of type string but got number
```

##### `oneOf`

Tries a multiple validators and choose the one which succeeds first:

```js+test
validateObject(oneOf(string, number), 'ok')
// => 'ok'

validateObject(oneOf(string, number), 42)
// => 42

validateObject(oneOf(string, number), true)
// ValidationError: Either:
//
//   Expected value of type string but got boolean
//
//   Expected value of type number but got boolean
//
```

##### `ref`

Allows to define recursive validators:

```js+test
let node = ref()

let tree = object({value: any, children: maybe(sequence(node))})

node.set(tree)

validateObject(tree, {value: 'ok'})
// => { value: 'ok' }

validateObject(tree, {value: 'ok', children: [{value: 'child'}]})
// => { value: 'ok', children: [ { value: 'child' } ] }
```

### Refining validations

Example:

```js+test
class Point {

  constructor(x, y) {
    this.x = x
    this.y = y
  }
}

let point = sequence(number).andThen((value, error) => {
  if (value.length !== 2) {
    throw error('Expected an array of length 2 but got: ' + value.length)
  }
  return new Point(value[0], value[1])
})

validateObject(point, [1, 2])
// => Point { x: 1, y: 2 }

validateJSON5(point, '[1, 2]')
// => Point { x: 1, y: 2 }

validateJSON5(point, '[1]')
// ValidationError: Expected an array of length 2 but got: 1 (line 1 column 1)
```


### Defining new schema types

Example:

```js+test
import {Node} from 'validated/schema'

class Point {

  constructor(x, y) {
    this.x = x
    this.y = y
  }
}

class PointNode extends Node {

  validate(context) {
    // prevalidate value with primitive validators
    let prevalidator = sequence(number)
    let {value, context: nextContext} = prevalidator.validate(context)

    // perform additional validations
    if (value.length !== 2) {

      // just report an error, context information such as line/column
      // numbers will be injected automatically
      throw context.error('Expected an array of length 2 but got: ' + value.length)
    }

    // construct a Point object, do whatever you want here
    let [x, y] = value
    let point = new Point(x, y)

    // return constructed value and the next context
    return {value: point, context: nextContext}
  }
}

validateObject(new PointNode(), [1, 2])
// => Point { x: 1, y: 2 }

validateJSON5(new PointNode(), '[1, 2]')
// => Point { x: 1, y: 2 }

validateJSON5(new PointNode(), '[1]')
// ValidationError: Expected an array of length 2 but got: 1 (line 1 column 1)
```
