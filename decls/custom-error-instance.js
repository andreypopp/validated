// @flow

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

  // declare type CustomErrorFactory = (
  //   message?: string,
  //   config?: Object,
  // ) => CustomError

  declare type CustomErrorApi = (
    name?: string,
    parent?: CustomError,
    properties?: Object,
    factory?: Function,
  ) => Class<CustomError>;

  declare export default CustomErrorApi;
}
