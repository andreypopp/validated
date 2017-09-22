/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

export function typeOf(value: any): string {
  if (value === null) {
    return 'null';
  } else if (Array.isArray(value)) {
    return 'array';
  } else {
    return typeof value;
  }
}

export function isObject(obj: any): boolean {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}

export function flatten(array: any): any {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    result = result.concat(array[i]);
  }
  return result;
}
