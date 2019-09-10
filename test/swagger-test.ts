/* eslint-disable no-console */
import { expect } from 'chai';
import { assertType } from 'typescript-is';
import refParser from 'json-schema-ref-parser';
import {
  getServerPath,
  getParamDetails,
  getSuccessResponse,
  SwaggerSchema,
  Param,
} from '../src/swagger';
import { EndpointParam } from '../src/getRequestOptions';
import { ArraySchema } from '../src/json-schema';

describe('swagger', () => {
  describe('getServerPath', () => {
    it('should support swagger 2 configuration', () => {
      expect(
        getServerPath({
          host: 'mock-host',
          paths: {},
        }),
      ).equal('http://mock-host');
    });

    it('should support swagger 2 with schemes and basePath', () => {
      expect(
        getServerPath({
          schemes: ['https'],
          host: 'mock-host',
          basePath: '/mock-basepath',
          paths: {},
        }),
      ).equal('https://mock-host/mock-basepath');
    });

    it('should support swagger 3 simple variables', () => {
      expect(
        getServerPath({
          servers: [
            {
              url: '{scheme}://mock-host{basePath}',
              variables: {
                scheme: 'https',
                basePath: '/mock-basepath',
              },
            },
          ],
          paths: {},
        }),
      ).equal('https://mock-host/mock-basepath');
    });

    it('should support swagger 3 variables without default', () => {
      expect(
        getServerPath({
          servers: [
            {
              url: '{scheme}://mock-host',
              variables: {
                scheme: {
                  enum: ['http'],
                },
              },
            },
          ],
          paths: {},
        }),
      ).equal('http://mock-host');
    });

    it('should support swagger 3 variables with default', () => {
      expect(
        getServerPath({
          servers: [
            {
              url: '{scheme}://mock-host',
              variables: {
                scheme: {
                  enum: ['mock-scheme'],
                  default: 'http',
                },
              },
            },
          ],
          paths: {},
        }),
      ).equal('http://mock-host');
    });
  });

  describe('getParameterDetails', () => {
    it('should get details for openapi 2 and 3', async () => {
      function testParameter(parameter: Param): void {
        try {
          assertType<Param>(parameter);
        } catch (e) {
          console.log('Not a Param:', parameter);
          throw e;
        }
        let paramDetails;
        try {
          paramDetails = getParamDetails(parameter);
          assertType<EndpointParam>(paramDetails);
        } catch (e) {
          console.log('Not EndpointParam:', JSON.stringify(paramDetails));
          console.log('parameter:', parameter);
          throw e;
        }
      }
      const openapi2Schema = (await refParser.dereference(
        `test/fixtures/petstore.yaml`,
      )) as SwaggerSchema;
      (openapi2Schema.paths['/pet'].post.parameters as Param[]).forEach(
        testParameter,
      );
      const openapi3Schema = (await refParser.dereference(
        `test/fixtures/petstore-openapi3.yaml`,
      )) as SwaggerSchema;
      (openapi3Schema.paths['/pet/findByStatus'].get
        .parameters as Param[]).forEach(testParameter);
    });
  });
});

describe('getSuccessResponse ', () => {
  it('should return responses for openapi 3', async () => {
    const openapi3Schema = (await refParser.dereference(
      `test/fixtures/petstore-openapi3.yaml`,
    )) as SwaggerSchema;
    const {
      get: { responses },
    } = openapi3Schema.paths['/pet/findByStatus'];
    const successResponse = getSuccessResponse(responses);
    if (!successResponse) {
      throw new Error('successResponse not defined');
    }
    expect((successResponse as ArraySchema).type).to.equal('array');
    expect((successResponse as ArraySchema).items).to.be.an('object');
  });

  it('should return responses for openapi 2', async () => {
    const openapi3Schema = (await refParser.dereference(
      `test/fixtures/petstore.json`,
    )) as SwaggerSchema;
    const {
      get: { responses },
    } = openapi3Schema.paths['/pet/findByStatus'];
    const successResponse = getSuccessResponse(responses);
    if (!successResponse) {
      throw new Error('successResponse not defined');
    }
    expect((successResponse as ArraySchema).type).to.equal('array');
    expect((successResponse as ArraySchema).items).to.be.an('object');
  });
});
