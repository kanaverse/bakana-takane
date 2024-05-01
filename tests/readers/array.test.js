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

test("sparse matrix loading works correctly on dense inputs", async () => {
    const mat = await arr.readSparseMatrix(path.join(PATH, "dense_matrix-basic"), localNavigator);
    expect(mat.numberOfRows()).toBe(10);
    expect(mat.numberOfColumns()).toBe(5);
    expect(mat.column(0)).toEqual(new Float64Array([1,2,3,4,5,6,7,8,9,10]));
    expect(mat.column(4)).toEqual(new Float64Array([41,42,43,44,45,46,47,48,49,50]));
})

test("sparse matrix loading works correctly on dense floating inputs", async () => {
    const mat = await arr.readSparseMatrix(path.join(PATH, "dense_matrix-basic-double"), localNavigator);
    expect(mat.numberOfRows()).toBe(10);
    expect(mat.numberOfColumns()).toBe(5);
    expect(mat.row(0)).toEqual(new Float64Array([1,11,21,31,41]).map(x => x / 2));
    expect(mat.row(9)).toEqual(new Float64Array([10,20,30,40,50]).map(x => x / 2));

    const mat2 = await arr.readSparseMatrix(path.join(PATH, "dense_matrix-basic-double"), localNavigator, { forceInteger: true });
    expect(mat2.numberOfRows()).toBe(10);
    expect(mat2.numberOfColumns()).toBe(5);
    expect(mat2.row(0)).toEqual(new Float64Array([1,11,21,31,41]).map(x => Math.trunc(x / 2)));
    expect(mat2.row(9)).toEqual(new Float64Array([10,20,30,40,50]).map(x => Math.trunc(x / 2)));
})

test("sparse matrix loading works correctly on dense native inputs", async () => {
    const mat = await arr.readSparseMatrix(path.join(PATH, "dense_matrix-native"), localNavigator);
    expect(mat.numberOfRows()).toBe(5);
    expect(mat.numberOfColumns()).toBe(10);
    expect(mat.column(0)).toEqual(new Float64Array([1,11,21,31,41]));
    expect(mat.column(9)).toEqual(new Float64Array([10,20,30,40,50]));
})

test("sparse matrix loading works correctly on sparse inputs", async () => {
    const mat = await arr.readSparseMatrix(path.join(PATH, "sparse_matrix-integer-csc"), localNavigator);
    expect(mat.numberOfRows()).toBe(10);
    expect(mat.numberOfColumns()).toBe(5);

    let first_ref = new Float64Array(10);
    first_ref[1] = 1;
    expect(mat.column(0)).toEqual(first_ref);

    let last_ref = new Float64Array(5);
    last_ref[4] = 5;
    expect(mat.row(9)).toEqual(last_ref);
})

test("sparse matrix loading works with doubles", async () => {
    const mat = await arr.readSparseMatrix(path.join(PATH, "sparse_matrix-double-csc"), localNavigator);
    expect(mat.numberOfRows()).toBe(10);
    expect(mat.numberOfColumns()).toBe(5);

    let first_ref = new Float64Array(10);
    first_ref[1] = 1/2;
    expect(mat.column(0)).toEqual(first_ref);

    let last_ref = new Float64Array(5);
    last_ref[4] = 5/2;
    expect(mat.row(9)).toEqual(last_ref);
})

test("sparse matrix loading works with forced integers", async () => {
    const mat = await arr.readSparseMatrix(path.join(PATH, "sparse_matrix-double-csc"), localNavigator, { forceInteger: true });
    expect(mat.numberOfRows()).toBe(10);
    expect(mat.numberOfColumns()).toBe(5);

    let first_ref = new Float64Array(10);
    expect(mat.column(0)).toEqual(first_ref);

    let second_ref = new Float64Array(10);
    second_ref[5] = 1;
    expect(mat.column(2)).toEqual(second_ref);

    let last_ref = new Float64Array(5);
    last_ref[4] = 2;
    expect(mat.row(9)).toEqual(last_ref);
})

test("sparse matrix loading works with CSR matrices", async () => {
    const mat = await arr.readSparseMatrix(path.join(PATH, "sparse_matrix-double-csr"), localNavigator);
    expect(mat.numberOfRows()).toBe(5);
    expect(mat.numberOfColumns()).toBe(10);

    let first_ref = new Float64Array(10);
    first_ref[1] = 1/2;
    expect(mat.row(0)).toEqual(first_ref);

    let second_ref = new Float64Array(10);
    second_ref[5] = 3/2;
    expect(mat.row(2)).toEqual(second_ref);

    let last_ref = new Float64Array(5);
    last_ref[4] = 5/2;
    expect(mat.column(9)).toEqual(last_ref);
})
