library(alabaster.base)
PATH <- "objects"
dir.create(PATH, showWarnings=FALSE)
library(SingleCellExperiment)

{
    full <- SingleCellExperiment(list(counts=matrix(runif(100) * 100, 20, 5), logged=matrix(100 + runif(100) * 20, 20, 5)))
    rownames(full) <- LETTERS[1:20]
    rowData(full)$Symbol <- letters[1:20]
    full$treatment <- rep(c(TRUE, FALSE), length.out=ncol(full))

    spike <- SummarizedExperiment(list(stuff=matrix(rpois(40, lambda=1), ncol=ncol(full))))
    rownames(spike) <- paste0("SPIKE", seq_len(nrow(spike)))
    altExp(full, "spikes", withDimnames=FALSE) <- spike

    adt <- SummarizedExperiment(list(foobar=matrix(rpois(20, lambda=1), ncol=ncol(full))))
    rownames(adt) <- paste0("ADT", seq_len(nrow(adt)))
    altExp(full, "adt", withDimnames=FALSE) <- adt 

    metadata(full) <- list(whee="foobar", stuff=2)

    reducedDim(full, "tsne") <- matrix(rnorm(10), ncol=2)
    reducedDim(full, "umap") <- matrix(rnorm(20), ncol=4)

    path <- file.path(PATH, "AbstractResult-basic")
    unlink(path, recursive=TRUE)
    saveObject(full, path)
}

{
    full <- SingleCellExperiment(list(counts=matrix(runif(100) * 100, 20, 5)))
    rownames(full) <- LETTERS[1:20]
    rowData(full)$Symbol <- letters[1:20]
    full$treatment <- rep(c(TRUE, FALSE), length.out=ncol(full))
    mainExpName(full) <- "gene"

    spike <- SummarizedExperiment(list(stuff=matrix(rpois(40, lambda=1), ncol=ncol(full))))
    rownames(spike) <- paste0("SPIKE", seq_len(nrow(spike)))
    altExp(full, "spikes", withDimnames=FALSE) <- spike

    adt <- SummarizedExperiment(list(foobar=matrix(rpois(20, lambda=1), ncol=ncol(full))))
    rownames(adt) <- paste0("ADT", seq_len(nrow(adt)))
    altExp(full, "adt", withDimnames=FALSE) <- adt 

    path <- file.path(PATH, "AbstractResult-named")
    unlink(path, recursive=TRUE)
    saveObject(full, path)
}

{
    full <- SummarizedExperiment(list(counts=matrix(runif(100) * 100, 20, 5) + 100))
    rownames(full) <- tail(LETTERS, 20)
    rowData(full)$Symbol <- paste0(letters[1:20], "_X")
    full$treatment <- rep(c(TRUE, FALSE), length.out=ncol(full))

    path <- file.path(PATH, "AbstractResult-se")
    unlink(path, recursive=TRUE)
    saveObject(full, path)
}
