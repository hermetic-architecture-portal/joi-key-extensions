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

let validationResult = Joi.validate(data, schema, {
  context: {
    data, // pass whole object tree as context.data
    schema, // pass schema of whole object tree as context.schema
  },
});

console.log(validationResult.error);
// null - no error

console.log('Example with invalid data');

data.countries.push({ countryId: 1, countryName: 'Fiji' });

validationResult = Joi.validate(data, schema, {
  context: {
    data,
    schema,
  },
});

console.log(validationResult.error);
// null - no error
// { ValidationError: child "countries" fails because
// ["countries" There is a duplicate value at path countries for keys {"countryId":1}]
