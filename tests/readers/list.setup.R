library(alabaster.base)
PATH <- "objects"
dir.create(PATH, showWarnings=FALSE)
library(S4Vectors)

{
    df <- list(
        strings = "A",
        integers = 1:3,
        numbers = 4:6/2,
        booleans = FALSE,
        factors = factor("Z"),
        nothing = NULL
    )

    path <- file.path(PATH, "list-basic")
    unlink(path, recursive=TRUE)
    dir.create(path)

    saveObject(df, file.path(path, "js"))
    saveObject(df, file.path(path, "h5"), list.format='hdf5')
}

{
    df <- list(
        strings = c("a", NA_character_),
        integers = c(1L, NA, 2L),
        numbers = c(3.5, NA, 4.5),
        booleans = c(NA, TRUE),
        factors = factor(c("Z", NA, "A"))
    )

    path <- file.path(PATH, "list-missing")
    unlink(path, recursive=TRUE)
    dir.create(path)

    saveObject(df, file.path(path, "js"))
    saveObject(df, file.path(path, "h5"), list.format='hdf5')
}

{
    df <- list(
        named = list(A = 1L, B = 2L),
        unnamed = list("X", "Y", "Z"),
        other = DataFrame(B = 2)
    )

    path <- file.path(PATH, "list-nested")
    unlink(path, recursive=TRUE)
    dir.create(path)

    saveObject(df, file.path(path, "js"))
    saveObject(df, file.path(path, "h5"), list.format='hdf5')
}

{
    ll <- list(
        strings = "A",
        integers = 1L,
        numbers = 2.0,
        booleans = FALSE
    )

    path <- file.path(PATH, "list-scalars")
    unlink(path, recursive=TRUE)
    dir.create(path)

    # Scalarizing the JSON file.
    jspath <- file.path(path, "js")
    saveObject(ll, jspath)
    fpath <- file.path(jspath, "list_contents.json.gz")
    payload <-jsonlite::fromJSON(gzfile(fpath), simplifyVector=FALSE)
    for (i in seq_along(payload$values)) {
        payload$values[[i]]$values <- payload$values[[i]]$values[[1]]
    }
    write(file=gzfile(fpath), jsonlite::toJSON(payload, auto_unbox=TRUE))
    validateObject(jspath)

    # Scalarizing the HDF5 file.
    h5path <- file.path(path, "h5")
    saveObject(ll, h5path, list.format='hdf5')
    fpath <- file.path(h5path, "list_contents.h5")
    fhandle <- rhdf5::H5Fopen(fpath)
    ghandle <- rhdf5::H5Gopen(fhandle, "simple_list")
    dhandle <- rhdf5::H5Gopen(ghandle, "data")

    xhandle0 <- rhdf5::H5Gopen(dhandle, "0")
    rhdf5::H5Ldelete(xhandle0, "data")
    alabaster.base::h5_write_vector(xhandle0, "data", ll$strings, scalar=TRUE)
    rhdf5::H5Gclose(xhandle0)

    xhandle1 <- rhdf5::H5Gopen(dhandle, "1")
    rhdf5::H5Ldelete(xhandle1, "data")
    alabaster.base::h5_write_vector(xhandle1, "data", ll$integers, scalar=TRUE)
    rhdf5::H5Gclose(xhandle1)

    xhandle2 <- rhdf5::H5Gopen(dhandle, "2")
    rhdf5::H5Ldelete(xhandle2, "data")
    alabaster.base::h5_write_vector(xhandle2, "data", ll$numbers, scalar=TRUE)
    rhdf5::H5Gclose(xhandle2)

    xhandle3 <- rhdf5::H5Gopen(dhandle, "3")
    rhdf5::H5Ldelete(xhandle3, "data")
    alabaster.base::h5_write_vector(xhandle3, "data", as.integer(ll$booleans), scalar=TRUE)
    rhdf5::H5Gclose(xhandle3)

    rhdf5::H5Gclose(dhandle)
    rhdf5::H5Gclose(ghandle)
    rhdf5::H5Fclose(fhandle)
    validateObject(h5path)
}
