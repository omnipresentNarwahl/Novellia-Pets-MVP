import { SpeciesLabelPipe } from './species-label.pipe';

describe('SpeciesLabelPipe', () => {
  const pipe = new SpeciesLabelPipe();

  it('labels the fixed species', () => {
    expect(pipe.transform({ species: 'DOG', speciesOther: null })).toBe('Dog');
    expect(pipe.transform({ species: 'REPTILE', speciesOther: null })).toBe('Reptile');
  });

  it('shows the typed description for Other', () => {
    expect(pipe.transform({ species: 'OTHER', speciesOther: 'axolotl' })).toBe('Other (axolotl)');
  });

  it('falls back to Other without a description, and ignores a stray one on other species', () => {
    expect(pipe.transform({ species: 'OTHER', speciesOther: null })).toBe('Other');
    expect(pipe.transform({ species: 'CAT', speciesOther: 'axolotl' })).toBe('Cat');
  });
});
