"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOa3NonBodyParam = function (param) {
    return param.name !== 'body' && !!param.schema;
};
