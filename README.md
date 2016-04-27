# validated

Validate your configurations with precise error messages.

Schema is defined with validators which are agnostic to the actual
representation of data, be it a JSON string, object in memory or any other
format.

Schema is used then with validator runners which keep track of context and
report validation errors with precise informations (such as line numbers and
column numbers).

The result of a validation is an object. It can be a plain JSON or some domain
model objects if schema is defined in that way.

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

TODO

##### `string`, `number`, `boolean`

TODO

##### `enumeration`

TODO

##### `mapping`

TODO

##### `sequence`

TODO

##### `object`

TODO

##### `maybe`

TODO

##### `oneOf`

TODO

##### `ref`

TODO

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
