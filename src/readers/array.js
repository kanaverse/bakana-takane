import * as scran from "scran.js";
import * as utils from "./utils.js";

function isDenseArrayTransposed(handle) {
    if (handle.attributes.indexOf("transposed") == -1) {
        return false;
    }
    const trans = handle.readAttribute("transposed").values[0];
    return (trans != 0);
}

export async function readDenseMatrix(path, navigator, { maxColumns = null } = {}) {
    const contents = await navigator.get(path + "/array.h5");
    const realized = scran.realizeFile(contents);
    const acquired = [];
    let nrow, ncol;

    try {
        const fhandle = new scran.H5File(realized.path);
        const ghandle = fhandle.open("dense_array");
        const dhandle = ghandle.open("data", { load: true });
        const dims = dhandle.shape;
        const contents = dhandle.values;

        if (isDenseArrayTransposed(ghandle)) {
            ncol = dims[0];
            nrow = dims[1];
            if (maxColumns !== null && maxColumns < ncol) {
                ncol = maxColumns;
            }
            for (var c = 0; c < ncol; c++) {
                const start = c * nrow;
                acquired.push(contents.slice(start, start + nrow));
            }

        } else {
            nrow = dims[0];
            ncol = dims[1];
            let usecol = ncol;
            if (maxColumns !== null && maxColumns < ncol) {
                usecol = maxColumns;
            }

            for (var c = 0; c < usecol; c++) {
                let output = new contents.constructor(nrow);
                for (var r = 0; r < nrow; r++) {
                    output[r] = contents[r * ncol + c];
                }
                acquired.push(output);
            }

            ncol = usecol;
        }

        if ("missing-value-placeholder" in dhandle.attributes) {
            const placeholder = dhandle.readAttribute("missing-value-placeholder").values[0];
            for (const [i, x] of acquired.entries()) {
                acquired[i] = utils.substitutePlaceholder(x, placeholder);
            }
        }

    } finally {
        realized.flush();
    }

    return { 
        rows: nrow, 
        columns: ncol, 
        values: acquired 
    };
}

export async function readSparseMatrix(path, navigator, { forceInteger = false } = {}) {
    const arrmeta = await navigator.fetchObjectMetadata(path);
    const arrtype = arrmeta.type;
    let output;

    if (arrtype == "dense_array") {
        const contents = await navigator.get(path + "/array.h5");
        const realized = scran.realizeFile(contents);
        try {
            // Checking whether it's transposed or not.
            const fhandle = new scran.H5File(realized.path);
            const dhandle = fhandle.open("dense_array");
            const is_trans = isDenseArrayTransposed(dhandle);

            // Checking for missing value placeholders.
            const vhandle = dhandle.open("data");
            if (vhandle.attributes.indexOf("missing-value-placeholder") != -1) {
                throw new Error("missing values in the dense array are not yet supported");
            }

            output = scran.initializeSparseMatrixFromHdf5DenseArray(realized.path, "dense_array/data", { transposed: is_trans, forceInteger });
        } finally {
            realized.flush();
        }

    } else if (arrtype == "compressed_sparse_matrix") {
        const contents = await navigator.get(path + "/matrix.h5");
        const realized = scran.realizeFile(contents);
        try {
            const fhandle = new scran.H5File(realized.path);
            const dhandle = fhandle.open("compressed_sparse_matrix");
            const shape = dhandle.open("shape", { load: true }).values;
            const layout = dhandle.readAttribute("layout").values[0];

            // Checking for missing value placeholders.
            const vhandle = dhandle.open("data");
            if (vhandle.attributes.indexOf("missing-value-placeholder") != -1) {
                throw new Error("missing values in the sparse matrix are not yet supported");
            }

            output = scran.initializeSparseMatrixFromHdf5SparseMatrix(realized.path, "compressed_sparse_matrix", shape[0], shape[1], layout == "CSC", { forceInteger });
        } finally {
            realized.flush();
        }

    } else {
        throw new Error("assay type '" + arrtype + "' is currently not supported");
    }

    return output;
}

export function isArraySupportedAsScranMatrix(type) {
    return (type == "dense_array" || type == "compressed_sparse_matrix");
}
