import * as df from "../../src/readers/DataFrame.js";
import { localNavigator } from "../utils.js";
import * as path from "path";
import * as scran from "scran.js";

beforeAll(async () => { await scran.initialize({ localFile: true }) });
afterAll(async () => { await scran.terminate() });

const PATH = "objects";

test("basic data frame loading works as expected", async () => {
    const basic_df = await df.readDataFrame(path.join(PATH, "DataFrame-basic"), localNavigator);
    expect(basic_df.columnNames()).toEqual(["strings", "integers", "numbers", "booleans", "factors" ]);
    expect(basic_df.numberOfRows()).toEqual(26);
    expect(basic_df.rowNames()).toBeNull();

    const strcol = basic_df.column("strings");
    expect(strcol instanceof Array).toBe(true);
    expect(strcol[0]).toBe("A");
    expect(strcol[25]).toBe("Z");

    const intcol = basic_df.column("integers");
    expect(intcol instanceof Int32Array).toBe(true);
    expect(intcol[0]).toBe(1);
    expect(intcol[25]).toBe(26);

    const numcol = basic_df.column("numbers");
    expect(numcol instanceof Float64Array).toBe(true);
    expect(numcol[0]).toBe(0.5);
    expect(numcol[25]).toBe(13);

    const boolcol = basic_df.column("booleans");
    expect(boolcol instanceof Array).toBe(true);
    expect(boolcol[0]).toBe(true);
    expect(boolcol[25]).toBe(false);

    const faccol = basic_df.column("factors");
    expect(faccol instanceof Array).toBe(true);
    expect(faccol[0]).toBe("a");
    expect(faccol[25]).toBe("z");
});

test("data frame loading works with row names", async () => {
    const basic_df = await df.readDataFrame(path.join(PATH, "DataFrame-named"), localNavigator);
    expect(basic_df.columnNames()).toEqual(["A", "B"]);
    expect(basic_df.numberOfRows()).toEqual(5);
    expect(basic_df.rowNames()).toEqual(["GENE1", "GENE2", "GENE3", "GENE4", "GENE5"]);
})

test("data frame loading works with missing values", async () => {
    const missing_df = await df.readDataFrame(path.join(PATH, "DataFrame-missing"), localNavigator);
    expect(missing_df.columnNames()).toEqual(["strings", "integers", "numbers", "booleans", "factors" ]);
    expect(missing_df.numberOfRows()).toEqual(26);

    const strcol = missing_df.column("strings");
    expect(strcol instanceof Array).toBe(true);
    expect(strcol[0]).toBeNull();
    expect(strcol[1]).toBe("B");

    const intcol = missing_df.column("integers");
    expect(intcol instanceof Array).toBe(true);
    expect(intcol[1]).toBeNull();
    expect(intcol[2]).toBe(3);

    const numcol = missing_df.column("numbers");
    expect(numcol instanceof Array).toBe(true);
    expect(numcol[2]).toBeNull();
    expect(numcol[3]).toBe(2);

    const boolcol = missing_df.column("booleans");
    expect(boolcol instanceof Array).toBe(true);
    expect(boolcol[3]).toBeNull();
    expect(boolcol[4]).toBe(true);

    const faccol = missing_df.column("factors");
    expect(faccol instanceof Array).toBe(true);
    expect(faccol[4]).toBeNull();
    expect(faccol[5]).toBe("f");
});

test("data frame loading works with nested DFs", async () => {
    const nested_df = await df.readDataFrame(path.join(PATH, "DataFrame-nested"), localNavigator);
    expect(nested_df.columnNames()).toEqual(["A", "B"]);
    expect(nested_df.numberOfRows()).toEqual(5);

    const acol = nested_df.column("A");
    expect(acol[0]).toBe(1);
    expect(acol[4]).toBe(5);

    const bcol = nested_df.column("B");
    expect(bcol.columnNames()).toEqual(["X", "Y"]);
    expect(bcol.numberOfRows()).toEqual(5);
});

