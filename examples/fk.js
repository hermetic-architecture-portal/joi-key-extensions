const VanillaJoi = require('joi');
const { fkExtension } = require('joi-key-extensions');

// add the extension to Joi
const Joi = VanillaJoi.extend(fkExtension.string);

const makeSchema = Joi.object({
  makeId: Joi.string(),
  name: Joi.string(),
});

const modelSchema = Joi.object({
  modelId: Joi.string(),
  name: Joi.string(),
  makeId: Joi.string()
    // define the foreign key reference
    .fk('makes.[].makeId'),
});

const schema = Joi.object({
  makes: Joi.array().items(makeSchema),
  models: Joi.array().items(modelSchema),
});

console.log('Examples with valid data');

const data = {
  makes: [
    { makeId: 'ford', name: 'Ford' },
    { makeId: 'mazda', name: 'Mazda' },
  ],
  models: [
    { modelId: 'laser', name: 'Laser', makeId: 'ford' },
    { modelId: 'familia', name: 'Familia', makeId: 'mazda' },
  ],
};

console.log('Validating whole object tree');
let validationResult = schema.validate(data, {
  context: {
    data, // pass whole object tree as context.data
    schema, // pass schema of whole object tree as context.schema
  },
});

console.log(validationResult.error);
// null - no error

console.log('Validating one model out of the object tree');
validationResult = modelSchema.validate(data.models[0], {
  context: {
    data,
    schema,
  },
});

console.log(validationResult.error);
// null - no error

console.log('Examples with invalid data');

data.models[0].makeId = 'fnord';

console.log('Validating whole object tree');
validationResult = schema.validate(data, {
  context: {
    data,
    schema,
  },
});

console.log(validationResult.error);
// { ValidationError: child "models" fails because
// ["models" at position 0 fails because
//   [child "makeId" fails because
//     ["makeId" "fnord" could not be found as a reference to "makes.[].makeId"]]]...

console.log('Validating one model out of the object tree');
validationResult = modelSchema.validate(data.models[0], {
  context: {
    data,
    schema,
  },
});

console.log(validationResult.error);
// { ValidationError: child "makeId" fails because
// ["makeId" "fnord" could not be found as a reference to "makes.[].makeId"]...
