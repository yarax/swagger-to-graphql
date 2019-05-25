import { expect } from 'chai';
import {
  GraphQLList,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLNonNull,
} from 'graphql';
import { jsonSchemaTypeToGraphQL, parseResponse } from '../src/typeMap';

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

  describe('jsonSchemaTypeToGraphQL', () => {
    it('should give an unsupported type for files', () => {
      const graphqlFileType = jsonSchemaTypeToGraphQL(
        'mocktitle',
        {
          type: 'file',
        },
        'mockpropertyname',
        true,
        {},
      );

      expect(graphqlFileType).to.be.instanceOf(GraphQLInputObjectType);
      expect(graphqlFileType.name).to.equal('mocktitle_mockpropertynameInput');

      expect(graphqlFileType.getFields()).to.deep.equal({
        unsupported: {
          name: 'unsupported',
          description: undefined,
          type: GraphQLString,
        },
      });
    });

    it('should give an unsupported type for list of files', () => {
      const graphqlList = jsonSchemaTypeToGraphQL(
        'mocktitle',
        {
          type: 'array',
          items: {
            type: 'file',
          },
        },
        'mockpropertyname',
        true,
        {},
      );

      expect(graphqlList).to.be.instanceOf(GraphQLList);

      const nonNullable = graphqlList.ofType;
      expect(nonNullable).to.be.instanceOf(GraphQLNonNull);

      const itemType = nonNullable.ofType;
      expect(itemType.name).to.equal('mocktitle_mockpropertynameInput');

      expect(itemType.getFields()).to.deep.equal({
        unsupported: {
          name: 'unsupported',
          description: undefined,
          type: GraphQLString,
        },
      });
    });

    // TODO: make this a union type?
    it('should take the first item type of an array with multiple item types', () => {
      const graphqlList = jsonSchemaTypeToGraphQL(
        'mocktitle',
        {
          type: 'array',
          items: [
            {
              type: 'string',
            },
            {
              type: 'integer',
            },
          ],
        },
        'mockpropertyname',
        true,
        {},
      );

      expect(graphqlList).to.be.instanceOf(GraphQLList);

      const nonNullable = graphqlList.ofType;
      expect(nonNullable).to.be.instanceOf(GraphQLNonNull);
      const itemType = nonNullable.ofType;
      expect(itemType).to.equal(GraphQLString);
    });
  });
});
