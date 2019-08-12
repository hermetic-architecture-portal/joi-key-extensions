const reachThisSchema = (schemaDesc, path) => {
  if ((!path.length)
    && schemaDesc.items && schemaDesc.items.length
    && schemaDesc.items[0].type === 'object') {
    return schemaDesc;
  }
  if (!path.length) {
    return null;
  }
  const nextPath = path.filter((item, index) => index > 0);
  if ((typeof path[0] === 'number')
    && (schemaDesc.type === 'array')
    && schemaDesc.items && schemaDesc.items.length
    && schemaDesc.items[0].type === 'object') {
    return reachThisSchema(schemaDesc.items[0], nextPath);
  }
  if ((typeof path[0] === 'string')
    && (schemaDesc.type === 'object')) {
    return reachThisSchema(schemaDesc.children[path[0]], nextPath);
  }
  return null;
};

const pkArrayExtension = joi => ({
  name: 'array',
  base: joi.array(),
  language: {
    noContext: 'The schema being validated must be passed in options.context.schema',
    // eslint-disable-next-line max-len
    noPrimaryKeys: 'The schema being validated does not have primary keys on the child object at path "{{path}}"',
    badSchema: 'The schema being validated does not have a child object at path "{{path}}"',
    duplicateValue: 'There is a duplicate value at path {{path}} for keys {{keys}}',
  },
  rules: [
    {
      name: 'uniqueOnPks',
      params: {
      },
      // eslint-disable-next-line consistent-return
      validate: (params, value, state, options) => {
        if (!(options && options.context && options.context.schema)) {
          return joi.createError('array.noContext', null, state, options);
        }
        // eslint-disable-next-line no-param-reassign
        options.context.schemaDesc = options.context.schemaDesc
          || options.context.schema.describe();
        const { schemaDesc } = options.context;
        let pkFields;

        const arraySchema = reachThisSchema(schemaDesc, state.path);
        if (!arraySchema) {
          return joi.createError(
            'array.badSchema', { path: state.path.join('.') }, state, options,
          );
        }
        if ((arraySchema.type === 'array')
          && arraySchema.items && arraySchema.items.length
          && arraySchema.items[0].type === 'object') {
          const itemDesc = arraySchema.items[0];
          pkFields = Object.getOwnPropertyNames(itemDesc.children)
            .filter(fieldName => (itemDesc.children[fieldName].type !== 'array')
              && itemDesc.children[fieldName].rules
              && itemDesc.children[fieldName].rules.some(r => r.name === 'pk'));
        }
        if (!(pkFields && pkFields.length)) {
          return joi.createError(
            'array.noPrimaryKeys', { path: state.path.join('.') }, state, options,
          );
        }
        if (value) {
          const uniqueKeys = [];
          const keyValues = value.map((item) => {
            const result = {};
            pkFields.forEach((fieldName) => { result[fieldName] = item[fieldName]; });
            return result;
          });
          for (let i = 0; i < keyValues.length; i += 1) {
            const kv = keyValues[i];
            if (uniqueKeys.find(other => pkFields
              .every(fieldName => kv[fieldName] === other[fieldName]))) {
              return joi.createError(
                'array.duplicateValue',
                { path: state.path.join('.'), keys: JSON.stringify(kv) },
                state, options,
              );
            }
            uniqueKeys.push(kv);
          }
        }
        return value;
      },
    },
  ],
});

const pkStringExtension = joi => ({
  name: 'string',
  base: joi.string(),
  // eslint-disable-next-line no-unused-vars
  rules: [
    {
      name: 'pk',
      params: {},
      // eslint-disable-next-line no-unused-vars
      validate: (params, value, state, prefs) => value,
    },
  ],
});

const pkNumberExtension = joi => ({
  name: 'number',
  base: joi.number(),
  // eslint-disable-next-line no-unused-vars
  rules: [
    {
      name: 'pk',
      params: {},
      // eslint-disable-next-line no-unused-vars
      validate: (params, value, state, prefs) => value,
    },
  ],
});

const pkDateExtension = joi => ({
  name: 'date',
  base: joi.date(),
  // eslint-disable-next-line no-unused-vars
  rules: [
    {
      name: 'pk',
      params: {},
      // eslint-disable-next-line no-unused-vars
      validate: (params, value, state, prefs) => value,
    },
  ],
});

export default {
  array: pkArrayExtension,
  string: pkStringExtension,
  number: pkNumberExtension,
  date: pkDateExtension,
};
