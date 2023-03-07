// @flow

// This is a partial libdef for custom-error-instance. It's filled out enough
// such that it should work for the purposes of validated. However, the
// documentation shows a potentially very complex API that might be hard to Flow
// to express to a general purpose audience such as `flow-typed`.
declare module 'custom-error-instance' {
  declare class CustomError extends Error {
    constructor(messageOrProps?: string | Object, properties?: Object): this;

    // These properties redeclared here are specifically for working with
    // validated. They allow the functions to be rewritten under Flow's eyes.
    // For more information see: https://github.com/facebook/flow/issues/1517
    toString: () => string;
    withContext: () => Error;
    message: string;
    originalMessage: string;
  }

  declare type CustomErrorApi = (
    name?: string,
    parent?: CustomError,
    properties?: Object,
    factory?: Function,
  ) => Class<CustomError>;

  declare export default CustomErrorApi;
}
