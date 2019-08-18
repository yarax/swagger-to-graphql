import { EndpointParam } from './../src/types';
import { expect } from 'chai';
import { getServerPath, loadSchema, getParamDetails } from '../src/swagger';
import { Param } from '../src/types';
import { assertType } from 'typescript-is';

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
      function testParameter(parameter: Param) {
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
      const openapi2Schema = await loadSchema(`test/fixtures/petstore.yaml`);
      (openapi2Schema.paths['/pet'].post.parameters as Param[]).forEach(
        testParameter,
      );
      const openapi3Schema = await loadSchema(
        `test/fixtures/petstore-openapi3.yaml`,
      );
      (openapi3Schema.paths['/pet/findByStatus'].get
        .parameters as Param[]).forEach(testParameter);
      testParameter({
        in: 'body',
        name: 'body',
        ...openapi3Schema.paths['/pet'].post.requestBody.content[
          'application/json'
        ],
      });
    });
  });
});
