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

