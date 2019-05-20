import { expect } from 'chai';
import {
  GraphQLList,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLFloat,
  GraphQLBoolean,
} from 'graphql';
import { parseResponse } from '../src/typeMap';

describe('typeMap', () => {
  describe('parseResponse', () => {
    it('should parse Objects', () => {
      expect(
        parseResponse(
          JSON.stringify({ a: 1 }),
          new GraphQLObjectType({
            name: 'Test',
            fields: { a: { type: GraphQLInt } },
          }),
        ),
      ).deep.equal({ a: 1 });
    });

    it('should parse Lists', () => {
      expect(
        parseResponse(JSON.stringify([1, 2]), new GraphQLList(GraphQLInt)),
      ).deep.equal([1, 2]);
    });

    it('should parse Ints', () => {
      expect(parseResponse(JSON.stringify(1), GraphQLInt)).deep.equal(1);
    });

    it('should parse Floats', () => {
      expect(parseResponse(JSON.stringify(1.5), GraphQLFloat)).deep.equal(1.5);
    });

    it('should parse Booleans', () => {
      expect(parseResponse(JSON.stringify(true), GraphQLBoolean)).deep.equal(
        true,
      );
    });
  });
});
