import { expect } from 'chai';
import {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';
import { jsonSchemaTypeToGraphQL } from '../src/typeMap';

describe('typeMap', () => {
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
        false,
      ) as GraphQLInputObjectType;

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
        false,
      ) as GraphQLList<GraphQLNonNull<GraphQLInputObjectType>>;

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
        false,
      ) as GraphQLList<GraphQLNonNull<GraphQLScalarType>>;

      expect(graphqlList).to.be.instanceOf(GraphQLList);

      const nonNullable = graphqlList.ofType;
      expect(nonNullable).to.be.instanceOf(GraphQLNonNull);
      const itemType = nonNullable.ofType;
      expect(itemType).to.equal(GraphQLString);
    });
  });
});
