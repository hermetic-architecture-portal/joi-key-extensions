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
    return reachThisSchema(schemaDesc.keys[path[0]], nextPath);
  }
  return null;
};

const pkArrayExtension = joi => ({
  type: 'array',
  base: joi.array(),
  messages: {
    noContext: 'The schema being validated must be passed in options.context.schema',
    // eslint-disable-next-line max-len
    noPrimaryKeys: 'The schema being validated does not have primary keys on the child object at path "{{#path}}"',
    badSchema: 'The schema being validated does not have a child object at path "{{#path}}"',
    duplicateValue: 'There is a duplicate value at path {{#path}} for keys {{#keys}}',
  },
  rules: {
    uniqueOnPks: {
      method() {
        return this.$_addRule({ name: 'uniqueOnPks' });
      },
      // eslint-disable-next-line consistent-return
      validate: (value, helpers) => {
        const options = helpers.prefs;
        const { state } = helpers;

        if (!(options && options.context && options.context.schema)) {
          return helpers.error('noContext', null);
        }
        // eslint-disable-next-line no-param-reassign
        options.context.schemaDesc = options.context.schemaDesc
          || options.context.schema.describe();
        const { schemaDesc } = options.context;
        let pkFields;

        const arraySchema = reachThisSchema(schemaDesc, state.path);
        if (!arraySchema) {
          return helpers.error('badSchema', { path: state.path.join('.') });
        }
        if ((arraySchema.type === 'array')
          && arraySchema.items && arraySchema.items.length
          && arraySchema.items[0].type === 'object') {
          const itemDesc = arraySchema.items[0];
          pkFields = Object.getOwnPropertyNames(itemDesc.keys)
            .filter(fieldName => (itemDesc.keys[fieldName].type !== 'array')
              && itemDesc.keys[fieldName].rules
              && itemDesc.keys[fieldName].rules.some(r => r.name === 'pk'));
        }
        if (!(pkFields && pkFields.length)) {
          return helpers.error('noPrimaryKeys', { path: state.path.join('.') });
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
              return helpers.error(
                'duplicateValue',
                { path: state.path.join('.'), keys: JSON.stringify(kv) },
              );
            }
            uniqueKeys.push(kv);
          }
        }
        return value;
      },
    },
  },
});

const pkStringExtension = joi => ({
  type: 'string',
  base: joi.string(),
  rules: {
    pk: {
      validate: value => value,
    },
  },
});

const pkNumberExtension = joi => ({
  type: 'number',
  base: joi.number(),
  rules: {
    pk: {
      validate: value => value,
    },
  },
});

const pkDateExtension = joi => ({
  type: 'date',
  base: joi.date(),
  rules: {
    pk: {
      validate: value => value,
    },
  },
});

export default {
  array: pkArrayExtension,
  string: pkStringExtension,
  number: pkNumberExtension,
  date: pkDateExtension,
};
