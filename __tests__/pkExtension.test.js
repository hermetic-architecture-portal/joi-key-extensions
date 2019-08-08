import VanillaJoi from 'joi';
import { pkExtension } from '../src/index';

const Joi = VanillaJoi
  .extend(pkExtension.array)
  .extend(pkExtension.string)
  .extend(pkExtension.number);

const basicSchema = Joi.array().items({
  key: Joi.string().pk(),
  name: Joi.string(),
}).uniqueOnPks();

const complexSchema = Joi.object({
  items: Joi.array().items({
    otherItems: Joi.array().items({
      key1: Joi.string().pk(),
      key2: Joi.number().pk(),
      name: Joi.string(),
    }).uniqueOnPks(),
  }),
});

describe('pkExtension', () => {
  it('passes with unique keys and basic schema', () => {
    const data = [
      { key: '1', name: 'a' },
      { key: '2', name: 'a' },
      { key: '3', name: 'a' },
    ];
    const validationResult = Joi.validate(data, basicSchema, {
      context: {
        schema: basicSchema,
      },
    });
    expect(validationResult.error).toBeFalsy();
  });
  it('fails with no primary keys schema', () => {
    const data = {
      y: [],
    };
    const badSchema = Joi.object({
      y: Joi.array().items({
        x: Joi.string(),
      }).uniqueOnPks(),
    });
    const validationResult = Joi.validate(data, badSchema, {
      context: {
        schema: badSchema,
      },
    });
    expect(validationResult.error).toBeTruthy();
    expect(validationResult.error.details[0].type).toBe('array.noPrimaryKeys');
  });
  it('fails with non-unique keys and basic schema', () => {
    const data = [
      { key: '1', name: 'a' },
      { key: '2', name: 'b' },
      { key: '2', name: 'c' },
    ];
    const validationResult = Joi.validate(data, basicSchema, {
      context: {
        schema: basicSchema,
      },
    });
    expect(validationResult.error).toBeTruthy();
    expect(validationResult.error.details[0].type).toBe('array.duplicateValue');
  });
  it('passes with unique keys and complex schema', () => {
    const data = {
      items: [
        {
          otherItems: [
            { key1: 'a', key2: 1, name: 'a' },
            { key1: 'a', key2: 2, name: 'a' },
          ],
        },
      ],
    };
    const validationResult = Joi.validate(data, complexSchema, {
      context: {
        schema: complexSchema,
      },
    });
    expect(validationResult.error).toBeFalsy();
  });
  it('fails with non-unique keys and complex schema', () => {
    const data = {
      items: [
        {
          otherItems: [
            { key1: 'a', key2: 1, name: 'a' },
            { key1: 'a', key2: 1, name: 'a' },
          ],
        },
      ],
    };
    const validationResult = Joi.validate(data, complexSchema, {
      context: {
        schema: complexSchema,
      },
    });
    expect(validationResult.error).toBeTruthy();
    expect(validationResult.error.details[0].type).toBe('array.duplicateValue');
  });
  it('fails with non object child schema', () => {
    const data = [];
    const badSchema = Joi.array().uniqueOnPks().items(Joi.string());
    const validationResult = Joi.validate(data, badSchema, {
      context: {
        schema: badSchema,
      },
    });
    expect(validationResult.error).toBeTruthy();
    expect(validationResult.error.details[0].type).toBe('array.badSchema');
  });
});
