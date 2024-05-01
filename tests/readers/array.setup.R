library(alabaster.base)
PATH <- "objects"
dir.create(PATH, showWarnings=FALSE)
library(S4Vectors)

{
    path <- file.path(PATH, "dense_matrix-basic")
    unlink(path, recursive=TRUE)
    y <- matrix(1:50, ncol=5)
    saveObject(y, path)
}

{
    path <- file.path(PATH, "dense_matrix-basic-double")
    unlink(path, recursive=TRUE)
    y <- matrix(1:50/2, ncol=5)
    saveObject(y, path)
}

{
    path <- file.path(PATH, "dense_matrix-native")
    unlink(path, recursive=TRUE)
    y <- matrix(1:50, ncol=5)
    saveObject(y, path)

    fhandle <- rhdf5::H5Fopen(file.path(path, "array.h5"))
    ghandle <- rhdf5::H5Gopen(fhandle, "dense_array")
    rhdf5::H5Adelete(ghandle, "transposed")
    rhdf5::H5Gclose(ghandle)
    rhdf5::H5Fclose(fhandle)
}

{
    path <- file.path(PATH, "sparse_matrix-integer-csc")
    unlink(path, recursive=TRUE)
    mat <- matrix(0L, nrow=10, ncol=5)
    mat[cbind((1:5)*2, 1:5)] <- 1:5
    saveObject(as(mat, "SVT_SparseMatrix"), path)
}

{
    path <- file.path(PATH, "sparse_matrix-double-csc")
    unlink(path, recursive=TRUE)
    mat <- matrix(0L, nrow=10, ncol=5)
    mat[cbind((1:5)*2, 1:5)] <- 1:5 / 2
    saveObject(as(mat, "SVT_SparseMatrix"), path)
}

{
    path <- file.path(PATH, "sparse_matrix-double-csr")
    unlink(path, recursive=TRUE)
    mat <- matrix(0L, nrow=10, ncol=5)
    mat[cbind((1:5)*2, 1:5)] <- 1:5 / 2
    saveObject(as(mat, "SVT_SparseMatrix"), path)

    fhandle <- rhdf5::H5Fopen(file.path(path, "matrix.h5"))
    ghandle <- rhdf5::H5Gopen(fhandle, "compressed_sparse_matrix")
    rhdf5::H5Adelete(ghandle, "layout")
    alabaster.base::h5_write_attribute(ghandle, "layout", "CSR", scalar=TRUE)
    rhdf5::H5Ldelete(ghandle, "shape")
    alabaster.base::h5_write_vector(ghandle, "shape", c(5L, 10L), type="H5T_NATIVE_UINT8")
    rhdf5::H5Gclose(ghandle)
    rhdf5::H5Fclose(fhandle)
    validateObject(path)
}
