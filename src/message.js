/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 * @flow
 */

import indent from 'indent-string';

export type GenericMessage = Message | string;

const NEWLINE = '\n';
const INDENT = '  ';

export class Message {
  message: ?string;
  children: Array<GenericMessage>;

  constructor(message: ?string, children: Array<GenericMessage> = []) {
    this.message = message;
    this.children = children;
  }

  toString() {
    if (this.message === null) {
      return this.children.map(m => m.toString()).join(NEWLINE);
    } else {
      return [this.message]
        .concat(this.children.map(m => indent(m.toString(), INDENT, 1)))
        .join(NEWLINE);
    }
  }
}

export class AlternativeMessage extends Message {
  alternatives: Array<GenericMessage>;

  static DESCRIPTION = 'Either:';

  constructor(alternatives: Array<GenericMessage>) {
    let children: Array<GenericMessage> = [''];
    alternatives.forEach(line => {
      children.push(line);
      children.push('');
    });
    super(AlternativeMessage.DESCRIPTION, children);
    this.alternatives = alternatives;
  }
}

export function message(
  message: ?string,
  inChildren: GenericMessage | Array<GenericMessage> = [],
) {
  const children = Array.isArray(inChildren) ? inChildren : [inChildren];
  if (children.length === 1 && message == null) {
    return children[0];
  }
  return new Message(message, children);
}
