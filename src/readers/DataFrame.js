import * as scran from "scran.js";
import * as bioc from "bioconductor";

export async function readDataFrame(path, navigator) {
    let colnames;
    let columns = [];
    let rownames = null;
    let nrows;

    let contents = await navigator.get(path + "/basic_columns.h5")
    let out = scran.realizeFile(contents);

    try {
        let handle = new scran.H5File(out.path);
        let ghandle = handle.open("data_frame");

        nrows = ghandle.readAttribute("row-count").values[0];
        colnames = ghandle.open("column_names", { load: true }).values;
        if ("row_names" in ghandle.children) {
            rownames = ghandle.open("row_names", { load: true }).values;
        }

        let chandle = ghandle.open("data");
        for (var i = 0; i < colnames.length; i++) {
            let iname = String(i);

            if (!(iname in chandle.children)) {
                // Try to load nested objects if they're DFs, but don't try too hard.
                let nested_path = path + "/other_columns/" + iname;
                try {
                    columns.push(await readDataFrame(nested_path, getter));
                } catch (e) {
                    console.warn("failed to extract nested DataFrame at '" + nested_path + "'; " + e.message);
                    columns.push(null);
                }
                continue;
            }

            let current;
            let objtype = chandle.children[iname]

            if (obtype == "DataSet") {
                let dhandle = chandle.open(iname, { load: true });
                let type = dhandle.readAttribute("type").values[0];

                if (type == "integer" || type == "string") {
                    current = dhandle.values;
                } else if (type == "number") {
                    current = dhandle.values;
                    if (!(current instanceof Float64Array) && !(current instanceof Float32Array)) {
                        current = new Float64Array(current);
                    }
                } else if (type == "boolean") {
                    current = new Array(dhandle.values.length);
                    for (const [i, x] of dhandle.values.entries()) {
                        current[i] = (x != 0);
                    }
                } else {
                    throw new Error("data frame column has unknown type '" + type + "'");
                }

                if ("missing-value-placeholder" in dhandle.attributes) {
                    let placeholder = dhandle.readAttribute("missing-value-placeholder").values[0];
                    current = utils.substitutePlaceholder(current, placeholder);
                }

            } else if (objtype == "Group") {
                let fhandle = chandle.open(iname);
                let type = fhandle.readAttribute("type").values[0];

                if (type == "factor") {
                    let levels = fhandle.open("levels", { load: true }).values;
                    let chandle = fhandle.open("codes", { load: true });
                    let codes = chandle.values;

                    let placeholder = -1;
                    if ("missing-value-placeholder" in chandle.attributes) {
                        placeholder = chandle.readAttribute("missing-value-placeholder").values[0];
                    }

                    current = new Array(codes.length);
                    for (const [i, x] of codes.entries()) {
                        if (x != placeholder) {
                            current[i] = levels[x];
                        } else {
                            current[i] = null;
                        }
                    }

                } else {
                    throw new Error("data frame column has unknown type '" + type + "'");
                }

            } else {
                throw new Error("data frame column is of an unknown HDF5 object type");
            }

            columns.push(current);
        }
    } finally {
        out.flush();
    }

    let new_columns = {};
    let new_colnames = [];
    for (var i = 0; i < columns.length; i++) {
        if (columns[i] != null) {
            new_columns[colnames[i]] = columns[i];
            new_colnames.push(colnames[i]);
        }
    }

    return new bioc.DataFrame(new_columns, { 
        columnOrder: new_colnames, 
        rowNames: rownames, 
        numberOfRows: nrows
    });
}
