# Joi Key Extensions

Joi Key Extensions provides extensions to the [Joi](https://github.com/hapijs/joi) validation library that allow validation of:
  * Foreign key style relationships, where a value must be a reference to a value elsewhere in an object tree.  Unlike the Joi built in built in [ref](https://github.com/hapijs/joi/blob/v15.0.1/API.md#refkey-options) validation, it can traverse arrays to look up references
  * Primary key values, validating that a set of keys are unique within an array of objects

## fkExtension

### Usage

```shell
npm install --save joi-key-extensions
```

```js
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


```

### API

#### `Joi.string().fk(args)`
#### `Joi.date().fk(args)`
#### `Joi.number().fk(args)`

Requires that a field value must be a reference to a value elsewhere in the object tree.

In the simplest case `args` is a string with a dot seperated list of object fields, with search across an array identified by square brackets (`[]`).

E.g. `Joi.number().fk('species.[].speciesId')` requires that the value must match the `speciesId` field in one of the items in the `species` array field.

The extension also supports multi-part foreign keys.  E.g.

```js
const animalSchema = Joi.object({
  animalId: Joi.string(),
  // genusId must correspond to an element in the genus array, matching on the genusId field
  genusId: Joi.string().fk('genus.[].genusId'),
  // speciesId must correspond to an element in the species array belonging to the genus element
  // identified by the genusId field
  speciesId: Joi.string().fk('genus.[].species.[].speciesId', { parentFieldName: 'genusId' }),
});
```

Refer to `__tests__ /fkExtension.text.js` for more examples

## pkExtension

### Usage

```shell
npm install --save joi-key-extensions
```

```js
const VanillaJoi = require('joi');
const { pkExtension } = require('joi-key-extensions');

// add the extension to Joi
const Joi = VanillaJoi
  .extend(pkExtension.number)
  .extend(pkExtension.array);

const countrySchema = Joi.object({
  countryId: Joi.number().pk(),
  countryName: Joi.string(),
});

const schema = Joi.object({
  countries: Joi.array()
    .items(countrySchema)
    .uniqueOnPks(),
});

const data = {
  countries: [
    { countryId: 1, countryName: 'Estonia' },
    { countryId: 2, countryName: 'Uruguay' },
  ],
};

console.log('Example with valid data');

let validationResult = schema.validate(data, {
  context: {
    data, // pass whole object tree as context.data
    schema, // pass schema of whole object tree as context.schema
  },
});

console.log(validationResult.error);
// null - no error

console.log('Example with invalid data');

data.countries.push({ countryId: 1, countryName: 'Fiji' });

validationResult = schema.validate(data, {
  context: {
    data,
    schema,
  },
});

console.log(validationResult.error);
// null - no error
// { ValidationError: child "countries" fails because
// ["countries" There is a duplicate value at path countries for keys {"countryId":1}]

```
### API

#### `Joi.string().pk()`
#### `Joi.number().pk()`
#### `Joi.date().pk()`

Identifies that the field is part of a primary key (composed of one or more fields).

#### `Joi.array().uniqueOnPks()`

Requires that the elements of the array must be unique with respect to their primary key fields