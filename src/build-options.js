import { argv } from 'yargs';

export const BUILD_OPTIONS = {
  NaN: 'nan'
};

export const buildOptions = argv.buildOptions ? argv.buildOptions.split(',').map(opt => opt.toLowerCase()) : [];