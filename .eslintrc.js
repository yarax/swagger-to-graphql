module.exports = {
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint',
    'plugin:import/typescript'
  ],
  rules: {
    'no-nested-ternary': 'off',
  },
};
