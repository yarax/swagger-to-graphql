import * as graphql from 'graphql';
import fs from 'fs';
import { expect } from 'chai';

import graphQLSchema from '../src';

describe('Fixture', () => {
  const directory = `${__dirname}/fixtures/`;
  fs.readdirSync(directory).forEach(file => {
    if (file.endsWith('.json')) {
      describe(file, () => {
        const graphqlFile = file.replace('.json', '.graphql');
        it(`should convert to ${graphqlFile}`, () =>
          graphQLSchema(directory + file).then(schema => {
            const graphqlfile = directory + graphqlFile;
            const graphschema = graphql.printSchema(schema);
            const expected = fs.readFileSync(graphqlfile, 'utf8');
            expect(graphschema).to.equal(expected);
          }));
      });
    }
  });
});
