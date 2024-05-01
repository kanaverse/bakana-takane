library(alabaster.base)
PATH <- "objects"
dir.create(PATH, showWarnings=FALSE)
library(SingleCellExperiment)

{
    full <- SingleCellExperiment(list(counts=matrix(runif(100) * 100, 20, 5), logged=matrix(runif(100) * 100, 20, 5)))
    rownames(full) <- LETTERS[1:20]
    rowData(full)$Symbol <- letters[1:20]
    full$treatment <- rep(c(TRUE, FALSE), length.out=ncol(full))

    spike <- SummarizedExperiment(list(stuff=matrix(rpois(40, lambda=1), ncol=ncol(full))))
    rownames(spike) <- paste0("SPIKE", seq_len(nrow(spike)))
    altExp(full, "spikes", withDimnames=FALSE) <- spike

    adt <- SummarizedExperiment(list(foobar=matrix(rpois(20, lambda=1), ncol=ncol(full))))
    rownames(adt) <- paste0("ADT", seq_len(nrow(adt)))
    altExp(full, "adt", withDimnames=FALSE) <- adt 

    path <- file.path(PATH, "AbstractDataset-first")
    unlink(path, recursive=TRUE)
    saveObject(full, path)
}

{
    full <- SingleCellExperiment(list(counts=matrix(runif(100) * 100, 20, 5), logged=matrix(runif(100) * 100, 20, 5)))
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

    path <- file.path(PATH, "AbstractDataset-named")
    unlink(path, recursive=TRUE)
    saveObject(full, path)
}

{
    full <- SummarizedExperiment(list(counts=matrix(runif(100) * 100, 20, 5) + 100))
    rownames(full) <- tail(LETTERS, 20)
    rowData(full)$Symbol <- paste0(letters[1:20], "_X")
    full$treatment <- rep(c(TRUE, FALSE), length.out=ncol(full))

    path <- file.path(PATH, "AbstractDataset-second")
    unlink(path, recursive=TRUE)
    saveObject(full, path)
}
