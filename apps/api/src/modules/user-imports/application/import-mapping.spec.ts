import { describe, expect, it } from 'vitest';
import {
  detectCanonicalMapping,
  mappingCoversIdentifier,
} from './import-mapping.js';

describe('import mapping', () => {
  it('detects case-insensitive canonical headers', () => {
    expect(
      detectCanonicalMapping(['Email', 'Mobile', 'External_ID', 'First Name']),
    ).toEqual({
      email: 'Email',
      mobile: 'Mobile',
      externalId: 'External_ID',
      firstName: 'First Name',
    });
  });

  it('requires an identifier column', () => {
    expect(
      mappingCoversIdentifier(detectCanonicalMapping(['first_name'])),
    ).toBe(false);
    expect(mappingCoversIdentifier(detectCanonicalMapping(['email']))).toBe(
      true,
    );
  });
});
