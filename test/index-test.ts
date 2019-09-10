import { expect } from 'chai';
import {
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { parseResponse } from '../src';

describe('parseResponse', () => {
  it('should convert non strings to string', () => {
    expect(parseResponse({ mock: 'object' }, GraphQLString)).to.equal(
      JSON.stringify({ mock: 'object' }),
    );
  });

  it('should ignore object', () => {
    expect(
      parseResponse(
        { a: 1 },
        new GraphQLObjectType({
          name: 'Test',
          fields: { a: { type: GraphQLInt } },
        }),
      ),
    ).deep.equal({ a: 1 });
  });

  it('should ignore Lists', () => {
    expect(parseResponse([1, 2], new GraphQLList(GraphQLInt))).deep.equal([
      1,
      2,
    ]);
  });

  it('should ignore Ints', () => {
    expect(parseResponse(1, GraphQLInt)).to.equal(1);
  });
});
