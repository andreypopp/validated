# validated

Validate your configurations with precise error messages.

Overview:

1. Define schema for a data structure (your app's configuration for example).
2. Validate either in memory value or JSON string against schema and receive
   precise error information (such as location of errors in sources and so on.
3. Receive deserialized configuration representation.

Example:

    import {mapping, object, string, number} from 'validated/schema'
    import {validate} from 'validated/json5'

    let schema = oneOf(
      object({a: number}),
      object({a: string})
    );

    validate(schema, {a: true})
    // error thrown:
    //
    // Either:
    //
    //   Expected value of type:
    //     number
    //   Found value of type:
    //     boolean
    //   While validating key:
    //     a
    //   At line 1 column 5
    //
    //   Expected value of type:
    //     string
    //   Found value of type:
    //     boolean
    //   While validating key:
    //     a
    //   At line 1 column 5
    //
    // At line 1 column 1
