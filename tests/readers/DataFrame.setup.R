library(alabaster.base)
PATH <- "objects"
dir.create(PATH, showWarnings=FALSE)
library(S4Vectors)

{
    df <- DataFrame(
        strings = LETTERS,
        integers = 1:26,
        numbers = 1:26 / 2,
        booleans = rep(c(TRUE, FALSE), length.out=26),
        factors = factor(letters, rev(letters))
    )

    path <- file.path(PATH, "DataFrame-basic")
    unlink(path, recursive=TRUE)
    saveObject(df, path)
}

{
    df <- DataFrame(
        strings = LETTERS,
        integers = 1:26,
        numbers = 1:26 / 2,
        booleans = rep(c(TRUE, FALSE), length.out=26),
        factors = factor(letters, rev(letters))
    )

    df$strings[1] <- NA
    df$integers[2] <- NA
    df$numbers[3] <- NA
    df$booleans[4] <- NA
    df$factors[5] <- NA

    path <- file.path(PATH, "DataFrame-missing")
    unlink(path, recursive=TRUE)
    saveObject(df, path)
}

{
    library(S4Vectors)
    df <- DataFrame(
        A = 1:5,
        B = I(DataFrame(X = (2:6)/2, Y = letters[1:5]))
    )
    path <- file.path(PATH, "DataFrame-nested")
    unlink(path, recursive=TRUE)
    saveObject(df, path)
}
