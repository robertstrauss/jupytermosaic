import { ObservableList } from '@jupyterlab/observables';


describe('observablelist removeValue test', () => {
  it('should be tested', () => {
    const a = new ObservableList();

    a.push(0);
    a.push(1);
    a.push(2);

    console.log('a = ', a);

    const a_0 = JSON.parse(JSON.stringify((a as any)._array)); // copy original a
    a.removeValue(3); // value not in a! shouldn't do anything.

    console.log('a = ', a);
    expect((a as any)._array).toEqual(a_0);
  });
});