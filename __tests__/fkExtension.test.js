import VanillaJoi from 'joi';
import { fkExtension } from '../src/index';

const Joi = VanillaJoi
  .extend(fkExtension.string);

const singlePartFkSchema = Joi.object({
  makes: Joi.array().items({
    makeId: Joi.string(),
    name: Joi.string(),
  }),
  models: Joi.array().items({
    modelId: Joi.string(),
    name: Joi.string(),
    makeId: Joi.string().fk('makes.[].makeId'),
  }),
});

const makesSinglePart = [
  { makeId: 'ford', name: 'Ford' },
  { makeId: 'mazda', name: 'Mazda' },
];

const modelsSinglePart = [
  { modelId: 'laser', name: 'Laser', makeId: 'ford' },
  { modelId: 'familia', name: 'Familia', makeId: 'mazda' },
];

// parent = two part fk, one part points to the parent of the lookup for the other
const parentFkSchema = Joi.object({
  makes: Joi.array().items({
    makeId: Joi.string(),
    name: Joi.string(),
    models: Joi.array().items({
      modelId: Joi.string(),
      name: Joi.string(),
    }),
  }),
  vehicles: Joi.array().items({
    chassisNumber: Joi.string(),
    makeId: Joi.string().fk('makes.[].makeId'),
    modelId: Joi.string().fk('makes.[].models.[].modelId', { parentFieldName: 'makeId' }),
  }),
});

const makesParentFk = [
  {
    makeId: 'ford',
    name: 'Ford',
    models: [{ modelId: 'laser', name: 'Laser' }],
  },
  {
    makeId: 'mazda',
    name: 'Mazda',
    models: [{ modelId: 'familia', name: 'Familia' }],
  },
];

describe('fkExtension', () => {
  it('passes valid data for single part FK', () => {
    const goodData = {
      makes: makesSinglePart,
      models: modelsSinglePart,
    };
    const validationResult = Joi.validate(goodData, singlePartFkSchema, {
      context: {
        data: goodData,
        schema: singlePartFkSchema,
      },
    });
    expect(validationResult.error).toBeFalsy();
  });
  it('fails invalid data for single part FK', () => {
    const badData = {
      makes: makesSinglePart,
      models: [Object.assign({}, modelsSinglePart[0], { makeId: 'nissan' })],
    };
    const validationResult = Joi.validate(badData, singlePartFkSchema, {
      context: {
        data: badData,
        schema: singlePartFkSchema,
      },
    });
    expect(validationResult.error).toBeTruthy();
    expect(validationResult.error.details[0].type).toBe('string.fkNotFound');
  });
  it('fails validation when context is not supplied', () => {
    const goodData = {
      makes: makesSinglePart,
      models: modelsSinglePart,
    };
    const validationResult = Joi.validate(goodData, singlePartFkSchema);
    expect(validationResult.error).toBeTruthy();
    expect(validationResult.error.details[0].type).toBe('string.noContextData');
  });
  it('passes valid data for two part parent FK', () => {
    const goodData = {
      makes: makesParentFk,
      vehicles: [
        { chassisNumber: '1234', makeId: 'mazda', modelId: 'familia' },
      ],
    };
    const validationResult = Joi.validate(goodData, parentFkSchema, {
      context: {
        data: goodData,
        schema: parentFkSchema,
      },
    });
    expect(validationResult.error).toBeFalsy();
  });
  it('fails invalid data for two part parent FK', () => {
    const badData = {
      makes: makesParentFk,
      vehicles: [
        { chassisNumber: '1234', makeId: 'mazda', modelId: 'laser' },
      ],
    };
    const validationResult = Joi.validate(badData, parentFkSchema, {
      context: {
        data: badData,
        schema: parentFkSchema,
      },
    });
    expect(validationResult.error).toBeTruthy();
    expect(validationResult.error.details[0].type).toBe('string.fkNotFound');
  });
  // eslint-disable-next-line max-len
  it('passes valid data for two part parent FK when parent field name doesn\'t match lookup field name', () => {
    const trickySchema = Joi.array().items({
      parentId: Joi.string(),
      children: Joi.array().items({
        childId: Joi.string(),
        friendParentId: Joi.string().fk('[].parentId'),
        friendChildId: Joi.string()
          .fk('[].children.[].childId', { parentFieldName: 'friendParentId' }),
      }),
    });
    const goodData = [
      {
        parentId: 'bob',
        children: [
          { childId: 'sam' },
        ],
      },
      {
        parentId: 'mary',
        children: [
          {
            childId: 'kelly',
            friendParentId: 'bob',
            friendChildId: 'sam',
          },
        ],
      },
    ];
    const validationResult = Joi.validate(goodData, trickySchema, {
      context: {
        data: goodData,
        schema: trickySchema,
      },
    });
    expect(validationResult.error).toBeFalsy();
  });
});
