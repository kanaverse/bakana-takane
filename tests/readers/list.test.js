import * as list from "../../src/readers/list.js";
import { localNavigator } from "../utils.js";
import * as path from "path";
import * as scran from "scran.js";

beforeAll(async () => { await scran.initialize({ localFile: true }) });
afterAll(async () => { await scran.terminate() });

const PATH = "objects";

test("basic list loading works as expected", async () => {
    const basic_list = await list.readSimpleList(path.join(PATH, "list-basic", "js"), localNavigator);
    expect(Object.keys(basic_list)).toEqual(["strings", "integers", "numbers", "booleans", "factors", "nothing" ]);

    expect(basic_list["strings"]).toEqual(["A"]);
    expect(basic_list["integers"]).toEqual(new Int32Array([1,2,3]));
    expect(basic_list["numbers"]).toEqual(new Float64Array([2,2.5,3]));
    expect(basic_list["booleans"]).toEqual([false]);
    expect(basic_list["factors"]).toEqual(["Z"]);
    expect(basic_list["nothing"]).toBeNull();

    const basic_list_h5 = await list.readSimpleList(path.join(PATH, "list-basic", "h5"), localNavigator);
    expect(basic_list_h5).toEqual(basic_list);
})

test("list loading works with missing values", async () => {
    const missing_list = await list.readSimpleList(path.join(PATH, "list-missing", "js"), localNavigator);
    expect(Object.keys(missing_list)).toEqual(["strings", "integers", "numbers", "booleans", "factors" ]);

    expect(missing_list["strings"]).toEqual(["a", null]);
    expect(missing_list["integers"]).toEqual([1,null,2]);
    expect(missing_list["numbers"]).toEqual([3.5,null,4.5]);
    expect(missing_list["booleans"]).toEqual([null, true]);
    expect(missing_list["factors"]).toEqual(["Z", null, "A"]);

    const missing_list_h5 = await list.readSimpleList(path.join(PATH, "list-missing", "h5"), localNavigator);
    expect(missing_list_h5).toEqual(missing_list);
})

test("list loading works with nesting", async () => {
    const nested_list = await list.readSimpleList(path.join(PATH, "list-nested", "js"), localNavigator);
    expect(Object.keys(nested_list)).toEqual(["named", "unnamed", "other"]);

    expect(nested_list["named"]).toEqual({ A: new Int32Array([1]), B: new Int32Array([2]) });
    expect(nested_list["unnamed"]).toEqual([["X"], ["Y"], ["Z"]]);
    expect(nested_list["other"]).toBeNull();

    const nested_list_h5 = await list.readSimpleList(path.join(PATH, "list-nested", "h5"), localNavigator);
    expect(nested_list_h5).toEqual(nested_list);
})

test("list loading works with scalars", async () => {
    const scalar_list = await list.readSimpleList(path.join(PATH, "list-scalars", "js"), localNavigator);
    expect(Object.keys(scalar_list)).toEqual(["strings", "integers", "numbers", "booleans"]);

    expect(scalar_list["strings"]).toEqual("A");
    expect(scalar_list["integers"]).toEqual(1);
    expect(scalar_list["numbers"]).toEqual(2);
    expect(scalar_list["booleans"]).toEqual(false);

    const scalar_list_h5 = await list.readSimpleList(path.join(PATH, "list-scalars", "h5"), localNavigator);
    expect(scalar_list_h5).toEqual(scalar_list);
})
