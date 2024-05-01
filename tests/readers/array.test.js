import * as arr from "../../src/readers/array.js";
import { localNavigator } from "../utils.js";
import * as path from "path";
import * as scran from "scran.js";

beforeAll(async () => { await scran.initialize({ localFile: true }) });
afterAll(async () => { await scran.terminate() });

const PATH = "objects";

test("dense matrix loading works as expected", async () => {
    const mat = await arr.readDenseMatrix(path.join(PATH, "dense_matrix-basic"), localNavigator);
    expect(mat.rows).toEqual(10);
    expect(mat.columns).toEqual(5);
    expect(mat.values.length).toEqual(mat.columns);
    expect(mat.values[0]).toEqual(new Uint8Array([1,2,3,4,5,6,7,8,9,10]));
    expect(mat.values[4]).toEqual(new Uint8Array([41,42,43,44,45,46,47,48,49,50]));
})

test("dense matrix loading works in native mode", async () => {
    const mat = await arr.readDenseMatrix(path.join(PATH, "dense_matrix-native"), localNavigator);
    expect(mat.rows).toEqual(5);
    expect(mat.columns).toEqual(10);
    expect(mat.values.length).toEqual(mat.columns);
    expect(mat.values[0]).toEqual(new Uint8Array([1,11,21,31,41]));
    expect(mat.values[9]).toEqual(new Uint8Array([10,20,30,40,50]));
})

test("dense matrix loading works with capped dimensions", async () => {
    const mat = await arr.readDenseMatrix(path.join(PATH, "dense_matrix-basic"), localNavigator, { maxColumns: 2 });
    expect(mat.rows).toEqual(10);
    expect(mat.columns).toEqual(2);
    expect(mat.values.length).toEqual(mat.columns);
    expect(mat.values[0]).toEqual(new Uint8Array([1,2,3,4,5,6,7,8,9,10]));
    expect(mat.values[1]).toEqual(new Uint8Array([11,12,13,14,15,16,17,18,19,20]));

    const nmat = await arr.readDenseMatrix(path.join(PATH, "dense_matrix-native"), localNavigator, { maxColumns: 2 });
    expect(nmat.rows).toEqual(5);
    expect(nmat.columns).toEqual(2);
    expect(nmat.values.length).toEqual(nmat.columns);
    expect(nmat.values[0]).toEqual(new Uint8Array([1,11,21,31,41]));
    expect(nmat.values[1]).toEqual(new Uint8Array([2,12,22,32,42]));
})
