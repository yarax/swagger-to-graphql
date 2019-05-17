import { expect } from 'chai';
import { getServerPath } from '../src/swagger';

describe('swagger', () => {
  describe('getServerPath', () => {
    it('should support swagger 2 configuration', () => {
      expect(
        getServerPath({
          host: 'mock-host',
        }),
      ).equal('http://mock-host');
    });

    it('should support swagger 2 with schemes and basePath', () => {
      expect(
        getServerPath({
          schemes: ['https'],
          host: 'mock-host',
          basePath: '/mock-basepath',
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
        }),
      ).equal('http://mock-host');
    });
  });
});
