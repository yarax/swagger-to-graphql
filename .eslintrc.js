module.exports = {
  parser: 'babel-eslint',
  extends: ['airbnb-base', 'plugin:prettier/recommended', "plugin:flowtype/recommended"],
  plugins:['flowtype'],
  rules: {
    "no-nested-ternary": "off"
  }
};
