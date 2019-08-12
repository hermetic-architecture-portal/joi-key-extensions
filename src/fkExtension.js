const findFk = (fkValue, data, pathChunks, parentFieldName, parentValue) => {
  if (!data) {
    return null;
  }
  if ((!pathChunks.length) && (fkValue === data)) {
    return data;
  }
  if (!pathChunks.length) {
    return null;
  }
  const currentChunk = pathChunks[0];
  const nextChunks = pathChunks.filter((item, index) => index > 0);
  if (currentChunk === '[]') {
    if (nextChunks.includes('[]')) {
      // this is the parent lookup
      const parentMatch = data.find(item => item[parentFieldName] === parentValue);
      if (!parentMatch) {
        return null;
      }
      return findFk(fkValue, parentMatch, nextChunks);
    }
    if (data.length) {
      for (let i = 0; i < data.length; i += 1) {
        const match = findFk(fkValue, data[i], nextChunks, parentFieldName, parentValue);
        if (match) {
          return match;
        }
      }
    }
  } else {
    return findFk(fkValue, data[currentChunk], nextChunks, parentFieldName, parentValue);
  }
  return null;
};

const getParentSchemaDesc = (schemaDesc, path) => {
  if (!path.length) {
    return schemaDesc;
  }
  const nextPath = path.filter((item, index) => index > 0);
  if ((typeof path[0] === 'number')
    && (schemaDesc.type === 'array')
    && schemaDesc.items && schemaDesc.items.length
    && schemaDesc.items[0].type === 'object') {
    return getParentSchemaDesc(schemaDesc.items[0], nextPath);
  }
  if ((typeof path[0] === 'string')
    && (schemaDesc.type === 'object')) {
    return getParentSchemaDesc(schemaDesc.children[path[0]], nextPath);
  }
  return null;
};

const getParentFkPath = (schemaDesc, path) => {
  const parentSchemaDesc = getParentSchemaDesc(schemaDesc, path);
  if (!parentSchemaDesc) {
    return null;
  }
  return parentSchemaDesc.rules && parentSchemaDesc.rules.find(r => r.name === 'fk');
};

const fkBaseExtension = (joi, baseType) => ({
  name: baseType,
  base: joi[baseType](),
  language: {
    noContextData: 'The data to look for FK references in must be passed in options.context.data',
    noContextSchema: 'The schema being validated must be passed in options.context.schema',
    // eslint-disable-next-line max-len
    twoArrays: '"{{path}}" contains two or more array elements, but the parentFieldName parameter is not supplied',
    // eslint-disable-next-line max-len
    threeArrays: '"{{path}}" contains three or more array elements and there is no mechanism to locate the right FK item',
    fkNotFound: '"{{value}}" could not be found as a reference to "{{path}}"',
    // eslint-disable-next-line max-len
    parentFieldNotFound: 'parentFieldName {{parentFieldName}} could not be found from path {{path}} or did not have a foreign key attribute',
  },
  rules: [
    {
      name: 'fk',
      params: {
        path: joi.string().required(),
        options: joi.object({
          parentFieldName: joi.string().optional(),
        }).optional(),
      },
      validate: (params, value, state, options) => {
        if (!(options && options.context && options.context.data)) {
          return joi.createError(`${baseType}.noContextData`,
            null, state, options);
        }

        if (!(options && options.context && options.context.schema)) {
          return joi.createError(`${baseType}.noContextSchema`,
            null, state, options);
        }

        // eslint-disable-next-line no-param-reassign
        options.context.schemaDesc = options.context.schemaDesc
          || options.context.schema.describe();
        const { schemaDesc } = options.context;

        const parentFieldName = (params.options && params.options.parentFieldName);

        let parentValue;

        let parentLookupFieldName;

        if (parentFieldName) {
          const parentPath = state.path
            .filter((item, index, array) => index < array.length - 1)
            .concat(parentFieldName);
          const parentFkRule = getParentFkPath(schemaDesc, parentPath);
          if (!parentFkRule) {
            return joi.createError(`${baseType}.parentFieldNotFound`,
              { path: params.path, parentFieldName },
              state, options);
          }
          parentLookupFieldName = parentFkRule.arg.path
            .split('.').pop();
          parentValue = state.parent && state.parent[parentFieldName];
        }

        const pathChunks = params.path.split('.');

        const arrayChunks = pathChunks.filter(c => c === '[]');

        if ((!parentFieldName) && (arrayChunks.length >= 2)) {
          return joi.createError(`${baseType}.twoArrays`,
            { path: params.path },
            state, options);
        }

        if (arrayChunks.length >= 3) {
          return joi.createError(`${baseType}.threeArrays`,
            { path: params.path },
            state, options);
        }

        if (!findFk(value, options.context.data, pathChunks, parentLookupFieldName, parentValue)) {
          return joi.createError(`${baseType}.fkNotFound`,
            { value, path: params.path },
            state, options);
        }
        return value;
      },
    },
  ],
});

const fkStringExtension = joi => fkBaseExtension(joi, 'string');
const fkNumberExtension = joi => fkBaseExtension(joi, 'number');
const fkDateExtension = joi => fkBaseExtension(joi, 'date');


export default {
  string: fkStringExtension,
  number: fkNumberExtension,
  date: fkDateExtension,
};
