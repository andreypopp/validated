// flow-typed signature: a08042e1cdd3c4a5f6619492d6bba137
// flow-typed version: 3581491ac8/indent-string_v3.2.x/flow_>=v0.25.x

declare module 'indent-string' {
  declare module.exports: (
    input: string,
    count?: number,
    opts?: {|
      +includeEmptyLines?: bool,
      +indent?: string,
    |}
  ) => string;
}
