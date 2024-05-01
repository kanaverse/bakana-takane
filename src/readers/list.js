import * as scran from "scran.js";
import * as utils from "./utils.js";

export async function readSimpleList(list_path, navigator) {
    const list_meta = await navigator.fetchObjectMetadata(list_path);

    let list_format = "hdf5";
    if ("format" in list_meta.simple_list) {
        list_format = list_meta.simple_list.format;
    }

    if (list_format == "json.gz") {
        const contents = await navigator.get(list_path + "/list_contents.json.gz");
        const res = new Response(contents.buffer);
        const stream = await res.body.pipeThrough(new DecompressionStream('gzip'));
        const unpacked = await new Response(stream).text();
        const parsed = JSON.parse(unpacked);
        return parseJsonList(parsed);

    } else if (list_format == "hdf5") {
        const contents = await navigator.get(list_path + "/list_contents.h5");
        const realized = scran.realizeFile(contents);
        let loaded;
        try {
            const handle = new scran.H5File(realized.path);
            const ghandle = handle.open("simple_list");
            loaded = parseHdf5List(ghandle);
        } finally {
            realized.flush();
        }
        return loaded;

    } else {
        throw new Error("unknown simple_list format '" + list_format + "'");
    }
}

// I'm just going to assume all of the lists are of version >= 1.2 (JSON).
function parseJsonList(obj) {
    if (!("type" in obj)) {
        throw new Error("non-standard JSON object for JSON 'simple_list'");
    }

    if (obj.type == "list") {
        if ("names" in obj) {
            let output = {};
            for (var i = 0; i < obj.values.length; i++) {
                output[obj.names[i]] = parseJsonList(obj.values[i]);
            }
            return output;

        } else {
            let output = [];
            for (var i = 0; i < obj.values.length; i++) {
                output.push(parseJsonList(obj.values[i]));
            }
            return output;
        }

    } else if (obj.type == "nothing") {
        return null;

    } else if (obj.type == "factor") {
        return obj.values.map(i => { 
            if (i == null) {
                return null;
            } else {
                return obj.levels[i];
            }
        });

    } else if (obj.type == "number") {
        const output = obj.values.map(x => {
            if (typeof x != "string") {
                return x;
            } else if (x == "Inf") {
                return Number.POSITIVE_INFINITY;
            } else if (x == "-Inf") {
                return Number.NEGATIVE_INFINITY;
            } else {
                return Number.NaN;
            }
        });
        if (output.indexOf(null) == -1) {
            return new Float64Array(output);
        } else {
            return output;
        }

    } else if (obj.type == "integer") {
        if (obj.values.indexOf(null) == -1) {
            return new Int32Array(obj.values);
        } else {
            return obj.values;
        }

    } else if (obj.type == "string" || obj.type == "boolean") {
        return obj.values;

    } else {
        console.warn("JSON simple list containing type '" + obj.type + "' is not yet supported");
        return null;
    }
}

// I'm just going to assume all of the lists are of version >= 1.3 (HDF5).
function parseHdf5List(handle) {
    const objtype = handle.readAttribute("uzuki_object").values[0];

    if (objtype == "list") {
        const dhandle = handle.open("data");
        if ("names" in handle.children) {
            const list_names = handle.open("names", { load: true }).values;
            const output = {};
            for (const [i, n] of list_names.entries()) {
                output[n] = parseHdf5List(dhandle.open(String(i), { load: true }));
            }
            return output;

        } else {
            const children = Object.keys(dhandle.children);
            const output = new Array(children.length);
            for (const i of children) {
                output[Number(i)] = parseHdf5List(dhandle.open(i, { load: true }));
            }
            return output;
        }

    } else if (objtype == "nothing") {
        return null;

    } else if (objtype == "vector") {
        const vectype = handle.readAttribute("uzuki_type").values[0];

        if (vectype == "string") {
            const vhandle = handle.open("data", { load: true });
            if (vhandle.attributes.indexOf("missing-value-placeholder") >= 0) {
                const placeholder = vhandle.readAttribute("missing-value-placeholder").values[0];
                return vhandle.values.map(x => {
                    if (x == placeholder) {
                        return null;
                    } else {
                        return x;
                    }
                });
            } else {
                return vhandle.values;
            }

        } else if (vectype == "boolean") {
            const vhandle = handle.open("data", { load: true });
            const values = vhandle.values;

            const output = new Array(values.length);
            if (vhandle.attributes.indexOf("missing-value-placeholder") >= 0) {
                const placeholder = vhandle.readAttribute("missing-value-placeholder").values[0];
                for (const [i, x] of values.entries()) {
                    if (x == placeholder) {
                        output[i] = null;
                    } else {
                        output[i] = (x != 0);
                    }
                }
            } else {
                for (const [i, x] of values.entries()) {
                    output[i] = (x != 0);
                }
            }

            return output;

        } else if (vectype == "integer" || vectype == "number") {
            const vhandle = handle.open("data", { load: true });
            let output = vhandle.values;

            if (vhandle.attributes.indexOf("missing-value-placeholder") >= 0) {
                const placeholder = vhandle.readAttribute("missing-value-placeholder").values[0];
                output = utils.substitutePlaceholder(output, placeholder);
            } else if (vectype == "number") {
                if (!(output instanceof Float64Array) && !(output instanceof Float32Array)) {
                    output = new Float64Array(output);
                }
            }

            return output;

        } else if (vectype == "factor") {
            const levels = handle.open("levels", { load: true }).values;
            const ihandle = handle.open("data", { load: true });
            const codes = ihandle.values;

            const output = new Array(codes.length);
            if (ihandle.attributes.indexOf("missing-value-placeholder") >= 0) {
                const placeholder = ihandle.readAttribute("missing-value-placeholder").values[0];
                for (const [i, x] of codes.entries()) {
                    if (x == placeholder) {
                        output[i] = null;
                    } else {
                        output[i] = levels[x];
                    }
                }
            } else {
                for (const [i, x] of codes.entries()) {
                    output[i] = levels[x];
                }
            }

            return output;

        } else {
            console.warn("HDF5 simple list containing a vector of type '" + vectype + "' is not yet supported");
            return null;
        }

    } else {
        console.warn("HDF5 simple list containing type '" + objtype + "' is not yet supported");
        return null;
    }
}
