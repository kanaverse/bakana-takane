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
