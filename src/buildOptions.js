import { argv } from 'yargs';

export const BUILD_OPTIONS = {
  NaN: 'allow-nan'
};

export const buildOptions = argv.options ? argv.options.split(',').map(opt => opt.toLowerCase()) : [];
