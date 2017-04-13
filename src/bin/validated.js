#!/usr/bin/env node
/**
 * @copyright 2016-present, Andrey Popp <8mayday@gmail.com>
 */

import fs from 'fs';
import invariant from 'invariant';
import program from 'commander';
import pkg from '../../package.json';
import {ValidationError} from '../schema';
import * as repr from '../repr';
import * as json5 from '../json5';

let args = program
  .version(pkg.version)
  .command('validated <schema> <config>')
  .parse(process.argv);

let [schema, config] = args.args;

if (!schema) {
  error('missing <schema> argument');
}

if (!config) {
  error('missing <config> argument');
}

function error(message) {
  console.error('error: ' + message); // eslint-disable-line no-console
  process.exit(1);
}

let schemaSrc = fs.readFileSync(schema, 'utf8');
let schemaNode;
try {
  schemaNode = json5.validate(repr.schema, schemaSrc);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message); // eslint-disable-line no-console
    console.error(`While validating schema "${schema}"`); // eslint-disable-line no-console
    process.exit(1);
  } else {
    throw error;
  }
}

invariant(schemaNode != null, 'Impossible');

let configSrc = fs.readFileSync(config, 'utf8');
let configValidated: any = undefined;
try {
  configValidated = json5.validate(schemaNode, configSrc);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message); // eslint-disable-line no-console
    console.error(`While validating "${config}"`); // eslint-disable-line no-console
    process.exit(1);
  } else {
    throw error;
  }
}

console.log(JSON.stringify(configValidated, null, 2)); // eslint-disable-line no-console
