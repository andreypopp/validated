# validated

Validate your configurations with precise error messages:

* Define schema with validators which are agnostic to the actual representation
  of data, be it a JSON string, object in memory or any other format.

* Use schema with runners specific for formats (object and JSON5 runners are
  included). Get error messages with precise info (line and column numbers for
  example).

* Get yhe result of a validation an object: either a plain JSON or some domain
  model if schema is defined in that way.

## Installation

    % npm install validated

## Usage

### Schema

Schema is defined with validators which are agnostic to the actual
representation of data, be it a JSON string or an object in memory:

    import {
      sequence, object, oneOf,
      string, number
    } from 'validated/schema'

    let person = object({
      firstName: string,
      lastName: string,
    })

    let pet = object({
      nickName: string,
      age: number,
    })

    let collection = sequence(oneOf(person, pet))

### List of schema primitives

##### `any`

Validates any value but not `undefined` or `null`:

    > validate(any, 'ok')
    'ok'

    > validate(any, 42)
    42

    > validate(any, null)
    ValidationError: expected a value but found null

    > validate(any, undefined)
    ValidationError: expected a value but found undefined

If you want to validated any value and even an absence of one then wrap it in
`maybe`:

    > validate(maybe(any), null)
    null

    > validate(maybe(any), undefined)
    undefined

##### `string`, `number`, `boolean`

Validate strings, numbers and booleans correspondingly.

    > validate(string, 'ok')
    'ok'

    > validate(number, 42)
    42

    > validate(boolean, true)
    true

##### `enumeration`

Validate enumerations:

    > validate(enumeration('yes', 'no'), 'yes')
    'yes'

    > validate(enumeration('yes', 'no'), 'no')
    'no'

    > validate(enumeration('yes', 'no'), 'oops')
    ValidationError: expected one of "yes", "no" found "oops"

##### `mapping`

Validate mappings from string keys to values.

Untyped values (value validator defaults to `any`):

    > validate(mapping(), {})
    {}

    > validate(mapping(), {a: 1, b: 'ok'})
    {a: 1, b: 'ok'}

    > validate(mapping(), 'oops')
    ValidationError: expected a mapping but but found string

Typed value:

    > validate(mapping(number), {a: 1})
    {a: 1}

    > validate(mapping(number), {a: 1, b: 'ok'})
    ValidationError: expected a number but but found string at key "b"

##### `sequence`

Validate sequences.

Untyped values (value validator defaults to `any`):

    > validate(sequence(), [])
    []

    > validate(sequence(), [1, 2, 'ok'])
    [1, 2, 'ok']

    > validate(sequence(), 'oops')
    validationerror: expected a sequence but but found string

Typed value:

    > validate(sequence(number), [1, 2])
    [1, 2]

    > validate(sequence(number), [1, 2, 'ok'])
    ValidationError: expected a number but but found string at index 2

##### `object`

Validate objects, objects must specify validator for each of its keys:

    let person = object({
      name: string,
      age: number,
    })

    > validate(person, {name: 'john', age: 27})
    {name: 'john', age: 27}

    > validate(person, {name: 'john'})
    ValidationError: missing key "age"

    > validate(person, {name: 'john', age: 'notok'})
    ValidationError: invalid type for key "age"

    > validate(person, {name: 'john', age: 42, extra: 'oops'})
    ValidationError: found extra key "extra"

If some key is optional, wrap its validator in `maybe`:

    let person = object({
      name: string,
      age: number,
      nickName: maybe(string),
    })

    > validate(person, {name: 'john', age: 27})
    {name: 'john', age: 27}

    > validate(person, {name: 'john', age: 27, nickName: 'J'})
    {name: 'john', age: 27, nickName: 'J'}

You can also specify default values for keys:

    let person = object({
      name: string,
      age: number,
      nickName: string,
    }, {
      nickName: 'John Doe'
    })

    > validate(person, {name: 'john', age: 27})
    {name: 'john', age: 27, nickName: 'John Doe'}

    > validate(person, {name: 'john', age: 27, nickName: 'J'})
    {name: 'john', age: 27, nickName: 'J'}

##### `maybe`

Validates `null` and `undefined` but passes through any other value to the
underlying validator:

    > validate(maybe(string), null)
    null

    > validate(maybe(string), undefined)
    undefined

    > validate(maybe(string), 'ok')
    'ok'

    > validate(maybe(string), 42)
    ValidationError: ...

##### `oneOf`

Tries a multiple validators and choose the one which succeeds first:

    > validate(oneOf(string, number), 'ok')
    'ok'

    > validate(oneOf(string, number), 42)
    42

    > validate(oneOf(string, number), true)
    ValidationError: ...

##### `ref`

Allows to define recursive validators:

    let node = ref()

    let tree = object({value: any, children: maybe(sequence(node))})

    node.set(tree)

    > validate(tree, {value: 'ok'})
    {value: 'ok'}

    > validate(tree, {value: 'ok', children: [{value: 'child'}]})
    {value: 'ok', children: [{value: 'child'}]}

### Validating objects in memory

Example:

    import {validate} from 'validated/object'

    let obj = validate(schema, input)

### Validating JSON/JSON5

Example:

    import {validate} from 'validated/json5'

    let obj = validate(schema, input)

### Defining new schema types

Example:

    import {Node, sequence, number} from 'validated/schema'

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
          context.error('Expected an array of length 2 but got: ' + value.length)
        }

        // construct a Point object, do whatever you want here
        let [x, y] = value
        let point = new Point(x, y)

        // return constructed value and the next context
        return {value: point, context: nextContext}
      }
    }
